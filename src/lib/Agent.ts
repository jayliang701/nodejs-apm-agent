

import WorkerManager from './WorkerManager';
import { AgentConfig } from './types';
import RPCClient from './RPCClient';
import MetricCollector from './MetricCollector';
// import LoggingCollector from './LoggingCollector';

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

    // private loggingCollector: LoggingCollector;
    private metricCollector: MetricCollector;
    
    async start(config: AgentConfig): Promise<void> {
        this.config = config;
        
        this.rpcClient = RPCClient.create();
        await this.rpcClient.run({
            serverAddress: this.config.serverAddress,
        });
        await this.workerManager.start();

        if (this.config.collect.metric.enabled) {
            this.metricCollector = new MetricCollector(this);
            this.metricCollector.start();
        }

        // if (this.config.collect.logging.enabled) {
        //     this.metricCollector = new MetricCollector(this);
        //     this.metricCollector.start();
        // }

        console.log(`APM Nodejs agent <${this.config.service}::${this.config.serviceInstance}> is running.`);
    }

    

}
