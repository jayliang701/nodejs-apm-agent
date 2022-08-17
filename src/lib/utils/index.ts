import crypto from 'crypto';

export function defaultSet<S extends object, T extends object>(defaultObj: S, target: T): T {
    for (let key in defaultObj) {
        const defaultVal = defaultObj[key];
        const kt = key as any;
        if (typeof defaultVal === 'object' && !(defaultVal instanceof RegExp || defaultVal instanceof Date)) {
            target[kt] = defaultSet(defaultVal as any, target[kt] || {});
        } else {
            const val = target[kt];
            if (!target.hasOwnProperty(kt) || val === undefined || val === null) {
                target[kt] = defaultObj[key];
            }
        }
    }
    return target;
}

export const md5 = (str: string | number): string => {
    return crypto.createHash('md5').update(String(str)).digest("hex");
}