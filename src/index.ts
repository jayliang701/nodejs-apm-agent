import cp, { ChildProcess } from 'child_process';
import cluster from "cluster";
import { DEFAULT_AGENT_CONFIG, PERSIST_FILE_FOLDER_PATH, PROCESS_EXIT_EVENTS } from './lib/consts';
import { AgentConfig, PersistData, WorkingMode } from './lib/types';
import path from 'path';
import { unlink, writeFile } from 'fs/promises';
import { defaultSet } from './lib/utils';
import crypto from 'crypto';
import { networkInterfaces } from 'os';
import { mkdirSync } from 'fs';

const getAgentIP = (): string => {
    const ip = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i?.internal)?.address;
    return ip;
}

const getPM2ID = (): Promise<string> => {
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            const pmid = process.env.NODE_APP_INSTANCE;
            if (pmid !== undefined && pmid !== null) {
                clearInterval(timer);
                resolve(pmid);
                return;
            }
        }, 500);
    });
}

const rebuildExecArgs = (filterAll: boolean = true) => {
    const args = [];
    for (let i = 0; i < process.execArgv.length; i ++) {
        let val = process.execArgv[i];
        if (val === '-r' || val === '--require') {
            if (filterAll) {
                i ++;
                continue;
            } else {
                let nextVal = process.execArgv[i + 1];
                if (nextVal && path.resolve(nextVal) === __filename) {
                    i ++;
                    continue;
                }
            }
        }
        args.push(val);
    }
    return args;
}

const randomServiceInstance = (seed: string): string => {
    return crypto.createHash('md5').update( `${seed}${Date.now()}${10000000 * Math.random()}${10000000 * Math.random()}`).digest("hex");
}

const setDefaultConfig = (config: Partial<AgentConfig> | undefined, ip: string): AgentConfig => {
    const conf: AgentConfig = config ? {...config} : {} as any;
    if (!conf.service) {
        throw new Error('agent configuration must contain "service" property');
    }

    conf.serverAddress = conf.serverAddress || DEFAULT_AGENT_CONFIG.serverAddress;

    if (!conf.serviceInstance) {
        conf.serviceInstance = `${randomServiceInstance(conf.service)}@${ip}`;
    }

    conf.collect = defaultSet(DEFAULT_AGENT_CONFIG.collect, conf.collect || {} as any);

    return conf;
}

const processPersistData = (persistFilePath: string) => {
    const refresh = async (): Promise<void> => {
        let workerPIDs: number[] = [];
        for (let key in cluster.workers) {
            workerPIDs.push(cluster.workers[key].process.pid);
        }
        try {
            const data: PersistData = { workerPIDs, primaryPID: process.pid };
            await writeFile(persistFilePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            //ignore error, try next time
            console.error(err);
        }

        setTimeout(() => {
            refresh();
        }, 30000);
    }

    unlink(persistFilePath).then(refresh).catch(err => {
        if (err.code !== 'ENOENT') {
            console.warn('clear persist file failed ---> ', err);
        }
        refresh();
    });
}

const killAgentProcess = (proc: ChildProcess) => {
    try {
        PROCESS_EXIT_EVENTS.forEach((eventType) => {
            proc.removeAllListeners(eventType);
        });
        proc.removeAllListeners('message');
        proc.unref();
        proc.ref();
    } catch {}
}

const startup = (mode: WorkingMode, passingConfig: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'>) => {
    
    const config = setDefaultConfig(passingConfig, getAgentIP());
    const persistFilePath = path.resolve(PERSIST_FILE_FOLDER_PATH, `${config.service}/${config.serviceInstance}.json`.replace(/@/img, '_'));
    
    let isExited = false;
    const debug = process.env.APM_AGENT_DEBUG == 'true' || String(process.env.NODE_ENV).toLowerCase() !== 'production';
    console.log(`[APM-Agent] agent debug mode: ${debug}`);
    console.log(`[APM-Agent] agent working mode: ${mode}`);
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        APM_AGENT_WORKING_MODE: mode,
        APM_AGENT_PARENT_PROCESS_PID: String(process.pid),
        APM_AGENT_CONFIG_JSON: JSON.stringify(config),
        APM_AGENT_PERSIST_FILE: persistFilePath,
    };
    const proc = cp.spawn('node', [ path.resolve(__dirname, 'agent.js') ], { 
        detached: false,
        stdio: debug ? undefined : 'ignore',
        cwd: process.cwd(),
        env,
    });
    if (debug) {
        proc.stderr.on('data', (data: Buffer) => {
            console.error(`[APM-Agent] [${proc.pid}]`, data.toString('utf-8'));
        });
        proc.stdout.on('data', (data: Buffer) => {
            console.log(`[APM-Agent] [${proc.pid}]`, data.toString('utf-8'));
        });
    }
    if (mode === WorkingMode.DEFAULT) {
        // proc.on('message', (message: ProcessMessage) => {
        //     if (message.event === 'ping') {
        //         let pids: number[] = [ process.pid ];
        //         for (let key in cluster.workers) {
        //             pids.push(cluster.workers[key].process.pid);
        //         }
        //         proc.send({ event: 'pong', data: { pids } });
        //     }
        // });
        mkdirSync(path.resolve(PERSIST_FILE_FOLDER_PATH, config.service), { recursive: true });
        processPersistData(persistFilePath);
    }
    PROCESS_EXIT_EVENTS.forEach((eventType) => {
        proc.once(eventType, (...rest) => {
            if (isExited) return;
            isExited = true;
            console.error(`APM Nodejs agent is exited with event "${eventType}". `, rest);
            killAgentProcess(proc);
        });
    });
}

process.execArgv = rebuildExecArgs(false);

setTimeout(async () => {

    let config: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'> = {
        service: process.env.APM_ENDPOINT_SERVICE,
        serviceInstance: process.env.APM_ENDPOINT_SERVICE_INSTANCE,
        serverAddress: process.env.APM_SERVER_ADDRESS
    };
    
    if (process.env.APM_AGENT_CONFIG) {
        config = require(process.env.APM_AGENT_CONFIG);
    }

    let mode: WorkingMode = WorkingMode.DEFAULT;
    let isPrimary: boolean = cluster.isPrimary;
    const isPM2 = !!process.env.PM2_HOME;
    if (isPM2) {
        const pmid = await getPM2ID();
        isPrimary = pmid == '0';
        mode = WorkingMode.PM2;
    }
    if (isPrimary) {
        startup(mode, config);
    }
}, 2000);

