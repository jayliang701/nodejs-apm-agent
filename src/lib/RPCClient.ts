

import { loadPackageDefinition, credentials, ServiceClientConstructor } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Http2ServerCallStream } from '@grpc/grpc-js/build/src/server-call';
import { LogBody, SkywalkingLoggingCollectData, MetricProcessRPCMessage, MetricRPCMessage, RPCClientConfig } from './types';
import TypedEventEmitter from './utils/TypedEventEmitter';
import { ServiceClient } from '@grpc/grpc-js/build/src/make-client';

type ServiceHandler = (service: { request: any, call?: Http2ServerCallStream<any, any> }, callback: any) => void;

const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const loadMetricProto = (filename: string): any => {
    const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'proto/' + filename), protoOptions);
    const proto = loadPackageDefinition(packageDefinition);
    return proto;
}

export default class RPCClient extends TypedEventEmitter {

    private static instance: RPCClient;

    public static create(): RPCClient {
        if (!RPCClient.instance) {
            const server = new RPCClient();
            RPCClient.instance = server;
        }
        return RPCClient.instance;
    }

    public static getSharedClient() {
        return RPCClient.instance;
    }

    metricClient: ServiceClient;

    loggingClient: ServiceClient;

    run(config: RPCClientConfig): Promise<void> {
        return new Promise(async (resolve) => {

            const { serverAddress } = config;

            // this.registerRPCServices();
            const metricProto = loadMetricProto('NodeJSMetric.proto');
            const MetricClient: ServiceClientConstructor = metricProto.pocketapm.NodeJSMetricReportService;
            this.metricClient = new MetricClient(serverAddress, credentials.createInsecure());
        
            const loggingProto = loadMetricProto('Logging.proto');
            const LoggingClient: ServiceClientConstructor = loggingProto.skywalking.v3.LogReportService;
            this.loggingClient = new LoggingClient(serverAddress, credentials.createInsecure());
            resolve();
        });
    }

    async reportMetric(service: string, serviceInstance: string, message: MetricProcessRPCMessage[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const body: MetricRPCMessage = {
                processes: message,
                service,
                serviceInstance,
            };
            this.metricClient.collect(body, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })
    }

    async reportLogs(service: string, serviceInstance: string, message: LogBody[]): Promise<void> {
        return new Promise((resolve) => {

            const call = this.loggingClient.collect((err) => {
                // console.log(err);
                resolve();
            });
            
            for (let msg of message) {
                const text: string = (msg as any)[Symbol.for('message')];
                const body: SkywalkingLoggingCollectData = {
                    timestamp: msg.timestamp,
                    service,
                    serviceInstance,
                    endpoint: msg.endpoint,
                    body: {
                        type: 'TEXT',
                        text: {
                            text,
                        },
                        content: 'text'
                    },
                    traceContext: {},
                    tags: {
                        data: [
                            { 
                                key: 'level', 
                                value: msg.LEVEL,
                            },
                            {
                                key: 'pid',
                                value: String(msg.pid),
                            }
                        ]
                    },
                    layer: '',

                };
                call.write(body);
            }
            call.end();
        })
    }

    shutdown(): Promise<void> {
        return new Promise((resolve) => {
            try {
                if (this.metricClient) this.metricClient.close();
            } catch {};
            resolve();
        });
    }

    dispose(): void {
        if (this === RPCClient.instance) {
            RPCClient.instance = undefined;
        }
        this.shutdown();
    }
}
