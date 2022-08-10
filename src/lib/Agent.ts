
import { networkInterfaces } from 'os';
import crypto from 'crypto';
import WorkerManager from './WorkerManager';
import { AgentConfig, Metric } from './types';
const pidusage = require('pidusage');

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
    try {
        const stats = await pidusage(pid);
        return {
            pid,
            cpu: stats.cpu,
            memory: stats.memory,
            aliveTime: stats.elapsed,
        }
    } catch {
        return {
            pid,
            cpu: 0,
            memory: 0,
            aliveTime: Date.now(),
        }
    }
}

export default class Agent {

    private timer: NodeJS.Timer;

    private config: AgentConfig;

    private workerManager: WorkerManager = new WorkerManager();
    
    async start(config: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'>): Promise<void> {
        const ip = getAgentIP();
        this.config = setDefaultConfig(config, ip);
        // this.startMonitor();
        await this.workerManager.start();
        this.startMonitor();
    }

    private startMonitor() {
        this.stopMonitor();
        this.timer = setInterval(async () => {
            const tasks: Promise<Metric>[] = [];

            const pids: number[] = await this.workerManager.refreshWorkerIds();
            console.log(pids);
            for (let pid of pids) {
                tasks.push(queryMetric(pid));
            }

            if (tasks.length > 0) {
                const res = await Promise.all(tasks);
                for (let metric of res) {
                    console.log(`${metric.pid} CPU: ${metric.cpu}      mem: ${metric.memory}`);
                }
                console.log(`----------------------------`);
            }
        }, this.config.collectDuration * 1000);
    }

    private stopMonitor() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    dispose() {
        this.stopMonitor();
    }

}
