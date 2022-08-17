

type DebounceFunc = (...rest: any[]) => any;

type DebounceOptions = {
    delay: number;  //ms
};

export class Debounce {

    private options: DebounceOptions;

    private timer: NodeJS.Timer;

    constructor(options: DebounceOptions) {
        this.options = options;
    }

    private stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    execute<T extends DebounceFunc>(fn: T, ...rest: Parameters<T>) {
        this.stopTimer();
        this.timer = setTimeout(() => {
            fn.apply(null, rest);
        }, this.options.delay);
    }

    dispose() {
        this.stopTimer();
    }

};