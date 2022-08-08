import cluster from "cluster";
import path from "path";
import { EventEmitter } from "stream";

const isPM2 = !!process.env.PM2_HOME;
let pm2;

const getWorkerIdsFromPrimaryProcess = (): number[] => {
    const pids: number[] = [];
    for (let key in cluster.workers) {
        const worker = cluster.workers[key];
        const pid = worker.process.pid;
        pids.push(pid);
    }
    return pids;
}

const getWorkerIdsFromPM2 = (): Promise<number[]> => {
    return new Promise((resolve, reject) => {
        pm2.list((err, list) => {
            if (err) {
                reject(err);
                return;
            }
            const pids: number[] = [];
            list.forEach(({ pid, pm2_env }) => {
                if (pm2_env.env.APM_ENDPOINT_SERVICE === process.env.APM_ENDPOINT_SERVICE) {
                    pids.push(pid);
                }
            });
            resolve(pids);
        });
    });
}

export default class WorkerManager extends EventEmitter {

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (isPM2) {
                try {
                    try {
                        pm2 = require('pm2');
                    } catch {
                        if (process.env.NODE_PATH) {
                            pm2 = require(path.resolve(process.env.NODE_PATH, 'pm2'));
                        } else {
                            pm2 = undefined;
                        }
                    }
                } catch {
                    pm2 = undefined;
                }
                if (pm2) {
                    pm2.connect((err) => {
                        if (err) {
                            pm2 = undefined;
                            reject(new Error(`connect pm2 failed. ${err.message || err}`));
                            return;
                        }
                        resolve();
                    });
                } else {
                    const err = new Error('missing pm2 module. You may need to execute "npm isntall pm2" or config "NODE_PATH" and update pm2 to use global pm2 module.');
                    reject(err);
                }
            } else {
                resolve();
            }
        });
    }

    async getWorkerIds(): Promise<number[]> {
        let pids: number[] = [];
        if (pm2) {
            pids = await getWorkerIdsFromPM2();
        } else if (cluster.workers) {
            pids = getWorkerIdsFromPrimaryProcess();
        }
        return pids;
    }

}