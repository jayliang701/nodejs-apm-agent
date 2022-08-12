import { homedir } from "os";
import path from "path";
import { AgentConfig } from "./types";

export const PROCESS_EXIT_EVENTS: string[] = [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`];

export const PERSIST_FILE_PATH: string = path.resolve(homedir(), '.apm-agent.json');

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    service: process.env.APM_ENDPOINT_SERVICE,
    serviceInstance: process.env.APM_ENDPOINT_SERVICE_INSTANCE,
    serverAddress: process.env.APM_SERVER_ADDRESS || '127.0.0.1:12700',
    collect: {
        logging: {
            enabled: false,
        },
        metric: {
            enabled: false,
            duration: 5,
            maxLen: 600,
        }
    }
};