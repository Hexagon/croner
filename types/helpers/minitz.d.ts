export function minitz(year: any, month: any, day: any, hour: any, minute: any, second: any, timezone: any, throwOnInvalidTime: any): Date;
export namespace minitz {
    export function fromTZISO(localTimeString: any, timezone: any, throwOnInvalidTime: any): Date;
    export function fromTZ(timePoint: any, throwOnInvalidTime: any): Date;
    export function toTZ(date: any, tzString: any): {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
        timezone: any;
    };
    export function tp(y: any, m: any, d: any, h: any, i: any, s: any, t: any): {
        year: any;
        month: any;
        day: any;
        hour: any;
        minute: any;
        second: any;
        timezone: any;
    };
    export { minitz };
}
export { minitz as default };
