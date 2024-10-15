import { CronDate } from "./date.ts";
import type { Cron } from "./croner.ts";

type CatchCallbackFn = (e: unknown, job: Cron) => void;
type ProtectCallbackFn = (job: Cron) => void;

/**
 * Options for configuring cron jobs.
 *
 * @interface
 */
interface CronOptions {
  /**
   * The name of the cron job. If provided, the job will be added to the
   * `scheduledJobs` array, allowing it to be accessed by name.
   */
  name?: string;

  /**
   * If true, the job will be paused initially.
   * @default false
   */
  paused?: boolean;

  /**
   * If true, the job will be stopped permanently.
   * @default false
   */
  kill?: boolean;

  /**
   * If true, errors thrown by the job function will be caught.
   * If a function is provided, it will be called with the error and the job instance.
   * @default false
   */
  catch?: boolean | CatchCallbackFn;

  /**
   * If true, the underlying timer will be unreferenced, allowing the Node.js
   * process to exit even if the job is still running.
   * @default false
   */
  unref?: boolean;

  /**
   * The maximum number of times the job will run.
   * @default Infinity
   */
  maxRuns?: number;

  /**
   * The minimum interval between job executions, in seconds.
   * @default 1
   */
  interval?: number;

  /**
   * If true, prevents the job from running if the previous execution is still in progress.
   * If a function is provided, it will be called if the job is blocked.
   * @default false
   */
  protect?: boolean | ProtectCallbackFn;

  /**
   * The date and time at which the job should start running.
   */
  startAt?: string | Date | CronDate;

  /**
   * The date and time at which the job should stop running.
   */
  stopAt?: string | Date | CronDate;

  /**
   * The timezone for the cron job.
   */
  timezone?: string;

  /**
   * The UTC offset for the cron job, in minutes.
   */
  utcOffset?: number;

  /**
   * If true, enables legacy mode for compatibility with older cron implementations.
   * @default true
   */
  legacyMode?: boolean;

  /**
   * An optional context object that will be passed to the job function.
   */
  context?: unknown;
}

/**
 * Processes and validates cron options.
 *
 * @param options The cron options to handle.
 * @returns The processed and validated cron options.
 * @throws {Error} If any of the options are invalid.
 */
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
