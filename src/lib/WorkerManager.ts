import { watchFile } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { EventEmitter } from "stream";
import { PersistData, WorkingMode } from "./types";

let pm2;

const getPersistData = async (): Promise<PersistData> => {
    const data: PersistData = JSON.parse(await readFile(process.env.APM_AGENT_PERSIST_FILE, 'utf-8'));
    return data;
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

const workingMode = process.env.APM_AGENT_WORKING_MODE as WorkingMode;
const isPM2 = workingMode === WorkingMode.PM2;

const startupPM2 = (): Promise<void> => {
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

export default class WorkerManager extends EventEmitter {

    pids: number[] = [];

    async start(): Promise<void> {
        await startupPM2();
        if (!pm2) {
            await this.onPersistDataChanged();
            watchFile(process.env.APM_AGENT_PERSIST_FILE, {}, this.onPersistDataChanged);
        }
    }

    async refreshWorkerIds(): Promise<number[]> {
        try {
            if (pm2) {
                this.pids = await getWorkerIdsFromPM2();
            }
        } catch (err) {
            console.warn(err);
        }
        return this.pids;
    }

    onPersistDataChanged = async () => {
        let primaryPID: number = Number(process.env.APM_AGENT_PARENT_PROCESS_PID);
        let pids: number[] = [];
        try {
            const data: PersistData = await getPersistData();
            if (data.primaryPID === primaryPID) {
                pids = data.workerPIDs;
            }
            pids.push(primaryPID);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.warn(`getPersistData() failed ---> `, err);
            }
            pids = [
                primaryPID,
            ];
        }
        this.pids = pids;
    }

}