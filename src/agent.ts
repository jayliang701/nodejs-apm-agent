import { appendFile } from "fs/promises";
import path from "path";
import Agent from "./lib/Agent";

const log = global.console.log.bind(console);
const error = global.console.error.bind(console);

global.console.log = (...rest) => {
    log.apply(console, rest);
    appendFile(path.resolve(process.cwd(), 'agent.log'), `${rest}\n`, 'utf-8');
};

global.console.error = (...rest) => {
    error.apply(console, rest);
    appendFile(path.resolve(process.cwd(), 'agent.log'), `${rest}\n`, 'utf-8');
};

const onError = (err) => {
    console.error(err);
    setTimeout(() => {
        process.exit();
    }, 200);
}

process.addListener('uncaughtException', onError);
process.addListener('unhandledRejection', onError);

const agent = new Agent();
agent.start({
    service: process.env.APM_ENDPOINT_SERVICE,
    serviceInstance: process.env.APM_ENDPOINT_SERVICE_INSTANCE,
    serverAddress: process.env.APM_SERVER_ADDRESS,
}).then(() => {
    console.log('APM Nodejs agent is running.');
}).catch(err => {
    onError(err);
});
