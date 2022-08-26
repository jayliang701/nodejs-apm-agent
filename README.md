# nodejs-apm-agent
NodeJS 应用程序的性能指标和日志采集代理, 通过 gRPC 向 [Pocket-APM](https://github.com/jayliang701/pocket-apm) 发送采集数据. 由于 Skywalking 官方的 NodeJS Agent 不提供对 NodeJS 应用的性能监控, 无法得知应用的 CPU 和内存使用数据, 因此我编写了这个采集代理. <br/>
nodejs-apm-agent 拥有以下特性:
- 无需修改应用程序代码, 以 --require 方式注入采集器;
- 使用 [winston](https://www.npmjs.com/package/winston) 输出格式化日志;
- 支持以 cluster 和 pm2 托管方式运行的 NodeJS 应用程序, 同时采集所有的集群进程;
- 运行于独立的 child_process 进程, 不会阻塞应用进程.

## 快速起步
1. 从此处下载已编译文件. 下载并解压缩后得到以下文件:
```
|-- proto                  # protobuf 协议文件
|-- nodejs-apm-agent.js    # agent 主程序文件
|-- agent-worker.js        # worker 程序文件
|-- agent.config.js        # 配置文件
```

2. 修改配置文件
```javascript
// ./agent.config.js
module.exports = {
    service: 'test-app',     //应用名称，和 Pocket-APM 的应用监控配置中的 skywalking.service 一致
    // serviceInstance: 'machine-01',   //[可选] 默认 agent 会自动生成
    serverAddress: '127.0.0.1:12700',   //Pocket-APM 服务的连接地址和端口
    collect: {
        metric: {
            enabled: true,   //是否开启 CPU 和内存监控
            duration: 5,     //秒, 每N秒发送一次 CPU 和 内存使用数据
        },
        logging: {
            enabled: true,   //是否开启日志监控
            globalVarName: 'logger',   //winston的 Logger 实例在全局域中的变量名称
        }
    }
}
```

3. 修改 NodeJS 应用的启动参数注入 agent. <br/>
原生 node 启动方式, 支持 cluster 模式
```bash
# 这里使用跨平台环境变量工具 cross-env 作为举例说明
cross-env APM_AGENT_CONFIG="{nodejs-apm-agent 目录路径}/agent.config.js" node -r '{nodejs-apm-agent 目录路径}/nodejs-apm-agent.js' server
```
pm2 托管方式
```javascript
// pm2.json
{
    "apps": [
        {
            "name": "server",
            "script": "./server.js",
            "cwd":"./",
            "instances": 4,
            "exec_mode": "cluster",
            "node_args": "-r {nodejs-apm-agent 目录路径}/nodejs-apm-agent.js",
            "env": {
                "APM_AGENT_CONFIG": "{nodejs-apm-agent 目录路径}/agent.config.js"
            },
            ...
        }
    ]
}
```
```bash
pm2 start pm2.json
```

## 关于日志格式化
nodejs-apm-agent 使用 [winston](https://www.npmjs.com/package/winston) 输出格式化日志. 默认情况下, agent 会自动创建 winston 的 Logger 实例, 并且使用默认的格式化配置, 默认格式如下:
```
[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [process pid] message
```

如果你需要自定义格式化配置, 或者在应用中你已经使用了 winston, 那么你可以将已有的 Logger 实例共享给 nodejs-apm-agent, 让它使用相同的日志格式化配置. 我们提供了以下简单粗暴的方式实现共享:
```javascript
// 你的 nodejs 应用
import { Logger, createLogger, format, transports } from 'winston';

const logger: Logger = createLogger({ 
	//...你的 logger 配置 
    ...
});

// 将 Logger 实例放在全局作用域中 
// 全局变量名默认是 logger
// 如果你想使用其它变量名, 你可以修改 agent.config.js 里的 globalVarName 属性
global['logger'] = logger;
```



## 源码编译
从 github 下载[源代码](https://github.com/jayliang701/nodejs-apm-agent.git), 安装 npm 依赖库:
```bash
git clone https://github.com/jayliang701/nodejs-apm-agent.git

cd nodejs-apm-agent

npm install
# or
# yarn
```
执行编译命令
```bash
sh ./build.sh
# windows 平台请运行 build.cmd
```
编译文件将输出到 dist 目录中.




