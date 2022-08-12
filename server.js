const express = require('express');

const cluster = require("cluster");
const totalCPUs = 2; //require("os").cpus().length;

if (cluster.isPrimary) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

    // cluster.on("exit", (worker, code, signal) => {
    //     console.log(`worker ${worker.process.pid} died`);
    //     console.log("Let's fork another worker!");
    //     cluster.fork();
    // });

    for (let i = 0; i < totalCPUs; i ++) {
        cluster.fork();
    }

} else {
    console.log(`Worker ${process.pid} started`);

    const app = express();
    const port = 3030;
    
    app.get('/', (req, res) => {
        res.send('Hello World!');
    });
    
    app.get('/block', (req, res) => {
        for (let i = 0; i < 100000000000; i++) {
            i;
        }
        res.writeHead(200);
        res.end();
    });
    
    app.get('/error', (req, res) => {
        console.error('this is error log');
        res.send('error');
    });
    
    app.get('/info', (req, res) => {
        console.log('this is info log');
        res.send('info');
    });
    
    app.get('/warn', (req, res) => {
        console.warn('this is warn log');
        res.send('warn');
    });
    
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    });

    // setInterval(() => {
    //     console.log('working...');
    // }, 6000);
}