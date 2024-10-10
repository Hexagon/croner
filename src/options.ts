import { CronDate } from "./date.ts";
import type { Cron } from "./croner.ts";

type CatchCallbackFn = (e: unknown, job: Cron) => void;
type ProtectCallbackFn = (job: Cron) => void;

interface CronOptions {
  name?: string;
  paused?: boolean;
  kill?: boolean;
  catch?: boolean | CatchCallbackFn;
  unref?: boolean;
  maxRuns?: number;
  interval?: number;
  protect?: boolean | ProtectCallbackFn;
  startAt?: string | Date | CronDate;
  stopAt?: string | Date | CronDate;
  timezone?: string;
  utcOffset?: number;
  legacyMode?: boolean;
  context?: unknown;
}

function CronOptionsHandler(options?: CronOptions): CronOptions {
  if (options === void 0) {
    options = {};
  }

  delete options.name;

  options.legacyMode = options.legacyMode === void 0 ? true : options.legacyMode;
  options.paused = options.paused === void 0 ? false : options.paused;
  options.maxRuns = options.maxRuns === void 0 ? Infinity : options.maxRuns;
  options.catch = options.catch === void 0 ? false : options.catch;
  options.interval = options.interval === void 0 ? 0 : parseInt(options.interval.toString(), 10);
  options.utcOffset = options.utcOffset === void 0
    ? void 0
    : parseInt(options.utcOffset.toString(), 10);
  options.unref = options.unref === void 0 ? false : options.unref;

  if (options.startAt) {
    options.startAt = new CronDate(options.startAt, options.timezone);
  }
  if (options.stopAt) {
    options.stopAt = new CronDate(options.stopAt, options.timezone);
  }

  if (options.interval !== null) {
    if (isNaN(options.interval)) {
      throw new Error("CronOptions: Supplied value for interval is not a number");
    } else if (options.interval < 0) {
      throw new Error("CronOptions: Supplied value for interval can not be negative");
    }
  }

  if (options.utcOffset !== void 0) {
    if (isNaN(options.utcOffset)) {
      throw new Error(
        "CronOptions: Invalid value passed for utcOffset, should be number representing minutes offset from UTC.",
      );
    } else if (options.utcOffset < -870 || options.utcOffset > 870) {
      throw new Error("CronOptions: utcOffset out of bounds.");
    }

    if (options.utcOffset !== void 0 && options.timezone) {
      throw new Error("CronOptions: Combining 'utcOffset' with 'timezone' is not allowed.");
    }
  }

  if (options.unref !== true && options.unref !== false) {
    throw new Error("CronOptions: Unref should be either true, false or undefined(false).");
  }

  return options;
}

export { type CronOptions, CronOptionsHandler };
