import EventEmitter from 'events';

export type TypedEvents = Record<string | symbol, (...args: any[]) => (Promise<void> | void)>;

export default class TypedEventEmitter<T extends TypedEvents = {}> extends EventEmitter {

    override removeAllListeners<E extends keyof T>(eventName: E): this {
        return super.removeAllListeners.apply(this, [ eventName ]);
    }

    override addListener<E extends keyof T>(eventName: E, listener: T[E]): this {
        return super.addListener.apply(this, [ eventName, listener ]);
    }

    override removeListener<E extends keyof T>(eventName: E, listener: T[E]): this {
        return super.removeListener.apply(this, [ eventName, listener ]);
    }

    override on<E extends keyof T>(eventName: E, listener: T[E]): this {
        return super.on.apply(this, [ eventName, listener ]);
    }

    override once<E extends keyof T>(eventName: E, listener: T[E]): this {
        return super.once.apply(this, [ eventName, listener ]);
    }

    override off<E extends keyof T>(eventName: E, listener: T[E]): this {
        return super.off.apply(this, [ eventName, listener ]);
    }

    override emit<E extends keyof T>(eventName: E, ...args: Parameters<T[E]>): boolean {
        return super.emit.apply(this, [ eventName, ...args ]);
    }

}