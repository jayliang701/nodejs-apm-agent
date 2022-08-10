

import { loadPackageDefinition, credentials, ServiceClientConstructor } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Http2ServerCallStream } from '@grpc/grpc-js/build/src/server-call';
import { MetricProcessRPCMessage, MetricRPCMessage, RPCClientConfig } from './types';
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

    client: ServiceClient;

    run(config: RPCClientConfig): Promise<void> {
        return new Promise(async (resolve) => {

            const { serverAddress } = config;

            // this.registerRPCServices();
            const metricProto = loadMetricProto('NodeJSMetric.proto');

            const MetricClient: ServiceClientConstructor = metricProto.pocketapm.NodeJSMetricReportService;

            this.client = new MetricClient(serverAddress, credentials.createInsecure());
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
            this.client.collect(body, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })
    }

    shutdown(): Promise<void> {
        return new Promise((resolve) => {
            try {
                if (this.client) this.client.close();
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
