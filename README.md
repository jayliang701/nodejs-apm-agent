# nodejs-apm-agent
NodeJS 应用程序的性能指标和日志采集代理, 通过 gRPC 向 [Pocket-APM](https://github.com/jayliang701/pocket-apm) 发送采集数据.<br/>
nodejs-apm-agent 拥有以下特性:
- 无需修改应用程序代码, 以 --require 方式注入采集器;
- 使用 [winston](https://www.npmjs.com/package/winston) 输出格式化日志;
- 支持以 cluster 和 pm2 托管方式运行的 NodeJS 应用程序, 同时采集所有的集群进程;
- 运行于独立的 child_process 进程, 不会阻塞应用进程.

## 使用和配置
从 github 下载[源代码](https://github.com/jayliang701/nodejs-apm-agent.git), 安装 npm 依赖库:
```bash
git clone https://github.com/jayliang701/nodejs-apm-agent.git

cd nodejs-apm-agent

npm install
# or
# yarn
```




