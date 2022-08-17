import { AgentConfig, LogBody, LogLevel } from './lib/types';
import { Logger, createLogger, format, transports } from 'winston';
import RPCLoggingTransport from './lib/RPCLoggingTransport';
import dayjs from 'dayjs';
import RPCClient from './lib/RPCClient';
import { Format, TransformableInfo } from 'logform';

const injectFormat: Format = {
    transform: (info: TransformableInfo, opts?: any): TransformableInfo | boolean => {
        const now = Date.now();
        info.timestamp = now;
        info.LEVEL = info.level.toUpperCase() as LogLevel;
        return info;
    }
}

const defaultFormat = format.printf((info: LogBody) => {
    const { LEVEL, message, timestamp } = info;
    let msg = `[${dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}] [${LEVEL}] [${info.pid}] ${message}`;
    return msg
});

export const initialize = async (config: AgentConfig, logger?: Logger): Promise<Logger> => {

    let rpcClient = RPCClient.getSharedClient();
    if (!rpcClient) {
        rpcClient = RPCClient.create();
        await rpcClient.run({
            serverAddress: config.serverAddress,
        });
    }

    const defaultMeta = { 
        service: config.service,
        pid: process.pid, 
    };

    if (logger) {
        logger.defaultMeta = logger.defaultMeta ? {
            ...logger.defaultMeta,
            ...defaultMeta,
        } : defaultMeta;
        logger.format = format.combine(injectFormat, logger.format);
        logger.add(new RPCLoggingTransport(rpcClient, config));
    } else {
        logger = createLogger({
            level: 'info',
            exitOnError: false,
            format: format.combine(
                injectFormat,
                format.splat(),
                format.errors({ stack: true }),
                defaultFormat,
            ),
            defaultMeta,
            transports: [
                new RPCLoggingTransport(rpcClient, config),
                new transports.Console(),
            ]
        });
    }

    // const trace = (level: LogLevel): (...rest: any[]) => void => {
    //     const func = level.toLowerCase();
    //     return (...rest: any[]) => {
    //         logger[func].apply(logger, rest);
    //     }
    // }

    // console.log = trace('INFO');
    // console.warn = trace('WARN');
    // console.error = trace('ERROR');

    return logger;
}