module.exports = {
    service: 'test-app',
    // serviceInstance: process.env.APM_ENDPOINT_SERVICE_INSTANCE,
    serverAddress: '127.0.0.1:12700',
    collect: {
        metric: {
            enabled: true,
            duration: 5,
        }
    }
}