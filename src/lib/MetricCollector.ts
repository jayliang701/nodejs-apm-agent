import Agent from "./Agent";
import RPCClient from "./RPCClient";
import { AgentConfig, Metric, MetricProcessRPCMessage } from "./types";
import TypedEventEmitter from "./utils/TypedEventEmitter";
const pidusage = require('pidusage');

const queryMetric = async (pid: number, time: number): Promise<Metric> => {
    try {
        const stats = await pidusage(pid);
        return {
            pid,
            cpu: stats.cpu,
            memory: stats.memory,
            aliveTime: stats.elapsed,
            time,
        }
    } catch {
        return {
            pid,
            cpu: 0,
            memory: 0,
            aliveTime: 0,
            time,
        }
    }
}

export default class MetricCollector extends TypedEventEmitter {

    private agent: Agent;

    private timer: NodeJS.Timer;

    get config(): AgentConfig {
        return this.agent.getConfig();
    }

    private pendingDict: Map<number, MetricProcessRPCMessage> = new Map();
    private messages: MetricProcessRPCMessage[] = [];

    constructor(agent: Agent) {
        super();
        this.agent = agent;
    }

    public start() {
        this.process();
    }

    private process() {
        this.stopProcess();
        this.timer = setTimeout(async () => {
            const r = Math.ceil(this.config.collect.metric.maxLen / 10);
            const tasks: Promise<Metric>[] = [];
            const now = Date.now();
            const pids: number[] = await this.agent.getWorkerManager().refreshWorkerIds();
            for (let pid of pids) {
                tasks.push(queryMetric(pid, now));
            }

            if (tasks.length > 0) {
                const res = await Promise.all(tasks);
                for (let metric of res) {
                    let pm = this.pendingDict.get(metric.pid);
                    if (!pm) {
                        pm = {
                            pid: metric.pid,
                            metrics: [],
                        };
                        this.pendingDict.set(metric.pid, pm);
                        this.messages.push(pm);
                    }
                    pm.metrics.push({
                        cpu: metric.cpu,
                        memory: metric.memory,
                        aliveTime: metric.aliveTime,
                        time: metric.time,
                    });

                    if (pm.metrics.length >= this.config.collect.metric.maxLen + r) {
                        //remove old metric data
                        pm.metrics.splice(0, r);
                    }
                }

                RPCClient.getSharedClient().reportMetric(this.config.service, this.config.serviceInstance, this.messages).then(() => {
                    console.log(`report metrics to APM server successfully`);

                    this.messages.length = 0;
                    this.pendingDict.clear();

                    this.process();
                }).catch(err => {
                    // console.error(`report metrics to APM server failed ---> `, err);
                    this.process();
                });
            } else {
                this.process();
            }

        }, this.config.collect.metric.duration * 1000);
    }

    private stopProcess() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    dispose() {
        this.stopProcess();
    }
}
