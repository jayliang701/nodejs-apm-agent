import Transport from 'winston-transport';
import RPCClient from './RPCClient';
import { AgentConfig, LogBody } from './types';
import { Debounce } from './utils/Debounce';

export default class RPCLoggingTransport extends Transport {

    private rpcClient: RPCClient;

    private config: AgentConfig;

    private debounce: Debounce;

    private logs: LogBody[] = [];

    private flushing: boolean = false;
    
    constructor(rpcClient: RPCClient, config: AgentConfig) {
        super();
        this.rpcClient = rpcClient;
        this.config = config;
        this.debounce = new Debounce({ 
            delay: 2000,
        });
    }

    log(info: LogBody, next: () => void) {
        this.logs.push(info);
        if (this.logs.length > 5 && !this.flushing) {
            this.report();
        } else {
            this.debounce.execute(this.report);
        }
        next();
    }

    report = async () => {
        try {
            const len = this.logs.length;
            if (len < 1) return;

            this.flushing = true;
            await this.rpcClient.reportLogs(this.config.service, this.config.serviceInstance, this.logs);
            this.logs.splice(0, len);
        } catch {
            //retry next time
        }
        this.flushing = false;
    }
}