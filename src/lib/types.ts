

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

export type Metric = {
    pid: number;
    cpu: number;
    aliveTime: number;
    memory: number;
};

export type AgentConfig = {
    serverAddress: string;    //IP:PORT   默认 127.0.0.1:12700
    service: string;
    serviceInstance: string;   //不指定则随机生成
    collectDuration: number;   //秒, 收集间隔, 默认5秒
};