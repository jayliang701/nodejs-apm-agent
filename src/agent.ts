import Agent from "./lib/Agent";

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
