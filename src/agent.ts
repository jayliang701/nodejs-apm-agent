import { AgentConfig } from "lib/types";
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

const config: AgentConfig = JSON.parse(process.env.APM_AGENT_CONFIG_JSON);

const onError = (err) => {
    console.error(err);
    setTimeout(() => {
        process.exit();
    }, 200);
}

process.addListener('uncaughtException', onError);
process.addListener('unhandledRejection', onError);

const agent = new Agent();
agent.start(config).catch(err => {
    onError(err);
});
