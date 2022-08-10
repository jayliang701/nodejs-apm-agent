import { homedir } from "os";
import path from "path";

export const PROCESS_EXIT_EVENTS: string[] = [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`];

export const PERSIST_FILE_PATH: string = path.resolve(homedir(), '.apm-agent.json');