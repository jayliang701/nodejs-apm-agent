
import { TransformableInfo } from 'logform';

export type RPCClientConfig = {
    serverAddress: string;
};

export type ProcessMessage<T = any> = {
    event: string;
    data: T;
};

export enum WorkingMode {
    DEFAULT = 'default',
    PM2 = 'pm2',
};

export type PersistData = {
    primaryPID: number;
    workerPIDs: number[];
};

export type RPCMessage = {
    service: string;
    serviceInstance: string;
};

export type MetricRPCMessage = {
    processes: MetricProcessRPCMessage[];
} & RPCMessage;

export type SkywalkingLoggingCollectData = {
    timestamp: number;
    endpoint: string;
    body: {
        type: 'TEXT' | 'JSON' | 'YAML';
        text?: {
            text: string;
        },
        json?: any;
        yaml?: any;
        content: 'text' | 'json' | 'yaml';
    },
    tags: {
        data: { key: string, value: string }[];
    },
    traceContext?: any;
    layer?: string;
} & RPCMessage;

export type MetricProcessRPCMessage = {
    pid: number;
    metrics: Omit<Metric, 'pid'>[];
};

export type Metric = {
    pid: number;
    cpu: number;
    aliveTime: number;
    memory: number;
    time: number;
};

export type AgentConfig = {
    serverAddress: string;    //IP:PORT   默认 127.0.0.1:12700
    service: string;
    serviceInstance: string;   //不指定则随机生成
    collect: {
        metric: {
            enabled: boolean;   //秒, 收集间隔, 默认5秒
            maxLen: number;   //缓存的最长数组长度
            duration: number;
        },
        logging: {
            enabled: boolean;
            globalVarName: string;   //logger对象的全局变量名称, 默认logger
        }
    }
};

export type LogLevel = 'ERROR' | 'INFO' | 'WARN' | 'DEBUG';

export type LogBody = {
    timestamp: number;
    service: string;
    pid: number;
    LEVEL: LogLevel;
} & TransformableInfo;