
import { networkInterfaces } from 'os';
import crypto from 'crypto';
import WorkerManager from './WorkerManager';
import { AgentConfig } from './types';
import RPCClient from './RPCClient';
import MetricCollector from './MetricCollector';
import { DEFAULT_AGENT_CONFIG } from './consts';
import { defaultSet } from './utils';

const getAgentIP = (): string => {
    const ip = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i?.internal)?.address;
    return ip;
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

export default class Agent {

    private config: AgentConfig;

    public getConfig() {
        return this.config;
    }

    private rpcClient: RPCClient;

    private workerManager: WorkerManager = new WorkerManager();

    public getWorkerManager() {
        return this.workerManager;
    }

    private metricCollector: MetricCollector;
    
    async start(config: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'>): Promise<void> {
        const ip = getAgentIP();
        this.config = setDefaultConfig(config, ip);
        
        this.rpcClient = RPCClient.create();
        await this.rpcClient.run({
            serverAddress: this.config.serverAddress,
        });
        await this.workerManager.start();

        if (this.config.collect.metric.enabled) {
            this.metricCollector = new MetricCollector(this);
            this.metricCollector.start();
        }

        console.log(`APM Nodejs agent <${this.config.service}::${this.config.serviceInstance}> is running.`);
    }

    

}
