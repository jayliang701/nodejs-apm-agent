
import { networkInterfaces } from 'os';
import crypto from 'crypto';
import cluster, { Worker } from 'cluster';
import WorkerManager from './WorkerManager';
const pidusage = require('pidusage');

type Metric = {
    pid: number;
    cpu: number;
    aliveTime: number;
    memory: NodeJS.MemoryUsage;
};

export type AgentConfig = {
    serverAddress: string;    //IP:PORT   默认 127.0.0.1:12700
    service: string;
    serviceInstance: string;   //不指定则随机生成
    collectDuration: number;   //秒, 收集间隔, 默认5秒
};

const getAgentIP = (): string => {
    const ip = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i?.internal)?.address;
    return ip;
}

const randomServiceInstance = (seed: string): string => {
    return crypto.createHash('md5').update( `${seed}${Date.now()}${10000000 * Math.random()}${10000000 * Math.random()}`).digest("hex");
}

const setDefaultConfig = (config: Partial<AgentConfig> | undefined, ip: string): AgentConfig => {
    const conf: AgentConfig = config ? {...config} : {} as any;
    if (!conf.serverAddress) {
        conf.serverAddress = '127.0.0.1:12700';
    }
    if (!conf.service) {
        throw new Error('agent configuration must contain "service" property');
    }

    if (!conf.serviceInstance) {
        conf.serviceInstance = `${randomServiceInstance(conf.service)}@${ip}`;
    }
    conf.collectDuration = conf.collectDuration || 5;

    return conf;
}

const queryMetric = async (pid: number): Promise<Metric> => {
    const mem = process.memoryUsage();
    const stats = await pidusage(pid);
    return {
        pid,
        cpu: stats.cpu,
        memory: mem,
        aliveTime: stats.elapsed,
    }
}

const EXIT_EVENTS: string[] = [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`];

export default class Agent {

    private timer: NodeJS.Timer;

    private config: AgentConfig;

    private workers: Record<number, Worker> = {};

    private workerManager: WorkerManager = new WorkerManager();
    
    async start(config: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'>): Promise<void> {
        const ip = getAgentIP();
        this.config = setDefaultConfig(config, ip);
        // this.startMonitor();
        await this.workerManager.start();
    }

    private startMonitor() {
        this.stopMonitor();
        this.timer = setInterval(async () => {
            const newWorkers: Record<number, Worker> = {};
            const tasks: Promise<Metric>[] = [];
            if (cluster.workers) {
                for (let key in cluster.workers) {
                    const worker = cluster.workers[key];
                    const pid = worker.process.pid;

                    newWorkers[pid] = worker;
                    tasks.push(queryMetric(pid));
                    // console.log(`${pid} CPU ---> ${stats.cpu}`);
                }
            }
            if (tasks.length > 0) {
                const res = await Promise.all(tasks);
                for (let metric of res) {
                    console.log(`${metric.pid} CPU: ${metric.cpu}      mem_heapUsed: ${metric.memory.heapUsed}      mem_heapTotal: ${metric.memory.heapTotal}`);
                }
                console.log(`----------------------------`);
            }
            const pids = Object.keys(this.workers);
            for (let pid of pids) {
                if (!newWorkers[pid]) {
                    //unregister
                    this.unRegisterWorker(this.workers[pid]);
                } else {
                    delete newWorkers[pid];
                }
            }
            for (let pid in newWorkers) {
                this.registerWorker(newWorkers[pid]);
            }
        }, this.config.collectDuration * 1000);
    }

    private registerWorker(worker: Worker) {
        if (worker.isDead()) {
            return;
        }
        const pid = worker.process.pid;
        console.log('register worker ---> ', pid);
        this.workers[pid] = worker;

        EXIT_EVENTS.forEach((eventType) => {
            worker.process.once(eventType, () => {
                console.error('worker shutdown ---> event:', eventType, '     pid:' , pid);
                this.unRegisterWorker(worker);
            });
        });

    }

    private unRegisterWorker(worker: Worker) {
        const pid = worker.process.pid;
        delete this.workers[pid];

        EXIT_EVENTS.forEach((eventType) => {
            worker.process.removeAllListeners(eventType);
        });

    }

    private stopMonitor() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    dispose() {
        this.stopMonitor();
        for (let pid in this.workers) {
            this.unRegisterWorker(this.workers[pid]);
        }
    }

}
