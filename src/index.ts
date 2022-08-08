import cp from 'child_process';
import cluster from "cluster";
import path from 'path';
import Agent from "./lib/Agent";

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

const rebuildExecArgs = () => {
    const args = [];
    for (let i = 0; i < process.execArgv.length; i ++) {
        let val = process.execArgv[i];
        if (val === '-r') {
            i ++;
            continue;
        } else {
            args.push(val);
        }
    }
    return args;
}

const AGENT_EXIT_EVENTS: string[] = [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`];

const startup = () => {
    let isExited = false;
    const proc = cp.spawn('node', [ path.resolve(__dirname, 'agent.js') ].concat(rebuildExecArgs()), { 
        detached: false,
        cwd: process.cwd(),
    });
    proc.stderr.on('data', (data: Buffer) => {
        console.error(`[APM-Agent] [${proc.pid}]`, data.toString('utf-8'));
    });
    proc.stdout.on('data', (data: Buffer) => {
        console.log(`[APM-Agent] [${proc.pid}]`, data.toString('utf-8'));
    });
    AGENT_EXIT_EVENTS.forEach((eventType) => {
        proc.once(eventType, (...rest) => {
            if (isExited) return;
            isExited = true;
            console.error(`APM Nodejs agent is exited with event "${eventType}". `, rest);
            AGENT_EXIT_EVENTS.forEach((et) => {
                proc.removeAllListeners(et);
            });
        });
    });
    // const proc = cluster.fork();
    // proc.on('message', ({ event, data }: any) => {
    //     if (event === 'ping') {
    //         const workerIds = [
    //             process.pid,
    //         ];
    //         for (let key in cluster.workers) {
    //             const pid = cluster.workers[key].process.pid;
    //             if (pid === proc.pid) continue;
    //             workerIds.push(pid);
    //         }
    //         proc.send({ event: 'pong', data: { workerIds }});
    //     }
    // });
    // const agent = new Agent();
    // agent.start({
    //     service: 'node-demo',
    // });
}

setTimeout(async () => {
    let isPrimary: boolean = cluster.isPrimary;
    if (!isPrimary) {
        const isPM2 = !!process.env.PM2_HOME;
        
        if (isPM2) {
            const pmid = await getPM2ID();
            isPrimary = pmid == '0';
        }
    }
    if (isPrimary) {
        startup();
    }
}, 2000);

