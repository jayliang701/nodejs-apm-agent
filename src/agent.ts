import { appendFile } from "fs/promises";
import { AgentConfig } from "lib/types";
import path from "path";
import Agent from "./lib/Agent";

// const log = global.console.log.bind(console);
// const error = global.console.error.bind(console);

// global.console.log = (...rest) => {
//     log.apply(console, rest);
//     appendFile(path.resolve(process.cwd(), 'agent.log'), `${rest}\n`, 'utf-8');
// };

// global.console.error = (...rest) => {
//     error.apply(console, rest);
//     appendFile(path.resolve(process.cwd(), 'agent.log'), `${rest}\n`, 'utf-8');
// };

const onError = (err) => {
    console.error(err);
    setTimeout(() => {
        process.exit();
    }, 200);
}

process.addListener('uncaughtException', onError);
process.addListener('unhandledRejection', onError);

let config: Partial<Omit<AgentConfig, 'service'>> & Pick<AgentConfig, 'service'> = {
    service: process.env.APM_ENDPOINT_SERVICE,
    serviceInstance: process.env.APM_ENDPOINT_SERVICE_INSTANCE,
    serverAddress: process.env.APM_SERVER_ADDRESS
};

if (process.env.APM_AGENT_CONFIG) {
    config = require(process.env.APM_AGENT_CONFIG);
}

const agent = new Agent();
agent.start(config).catch(err => {
    onError(err);
});
