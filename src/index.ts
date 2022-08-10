import cp, { ChildProcess } from 'child_process';
import cluster from "cluster";
import { PERSIST_FILE_PATH, PROCESS_EXIT_EVENTS } from './lib/consts';
import { PersistData, WorkingMode } from './lib/types';
import path from 'path';
import { unlink, writeFile } from 'fs/promises';

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

const processPersistData = () => {
    const refresh = async (): Promise<void> => {
        let workerPIDs: number[] = [];
        for (let key in cluster.workers) {
            workerPIDs.push(cluster.workers[key].process.pid);
        }
        try {
            const data: PersistData = { workerPIDs, primaryPID: process.pid };
            await writeFile(PERSIST_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
        } catch {
            //ignore error, try next time
        }

        setTimeout(() => {
            refresh();
        }, 30000);
    }

    unlink(PERSIST_FILE_PATH).then(refresh).catch(err => {
        console.warn('clear persist file failed ---> ', err);
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

const startup = (mode: WorkingMode) => {
    let isExited = false;
    const debug = process.env.APM_AGENT_DEBUG == 'true' || String(process.env.NODE_ENV).toLowerCase() !== 'production';
    console.log(`[APM-Agent] agent debug mode: ${debug}`);
    console.log(`[APM-Agent] agent working mode: ${mode}`);
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        APM_AGENT_WORKING_MODE: mode,
        APM_AGENT_PARENT_PROCESS_PID: String(process.pid),
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
        processPersistData();
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
    let mode: WorkingMode = WorkingMode.DEFAULT;
    let isPrimary: boolean = cluster.isPrimary;
    const isPM2 = !!process.env.PM2_HOME;
    if (isPM2) {
        const pmid = await getPM2ID();
        isPrimary = pmid == '0';
        mode = WorkingMode.PM2;
    }
    if (isPrimary) {
        startup(mode);
    }
}, 2000);

