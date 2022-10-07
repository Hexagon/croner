export function minitz(y: any, m: any, d: any, h: any, i: any, s: any, tz: any, throwOnInvalid: any): Date;
export namespace minitz {
    export function fromTZISO(localTimeStr: any, tz: any, throwOnInvalid: any): Date;
    export function fromTZ(tp: any, throwOnInvalid: any): Date;
    export function toTZ(d: any, tzStr: any): {
        y: number;
        m: number;
        d: number;
        h: number;
        i: number;
        s: number;
        tz: any;
    };
    export function tp(y: any, m: any, d: any, h: any, i: any, s: any, tz: any): {
        y: any;
        m: any;
        d: any;
        h: any;
        i: any;
        s: any;
        tz: any;
    };
    export { minitz };
}
export { minitz as default };
