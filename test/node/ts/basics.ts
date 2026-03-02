import Cron from "../../../";
import type { CronOptions, CronJob, CronCallback, CatchCallbackFn, ProtectCallbackFn, CronDate, CronPatternPart, TimePoint } from "../../../";

// Test basic (backwards compatible - no generic)
const test1 : Cron = new Cron("* * * * * *", () => {
	console.log("This will run every second.");
});

// With options
const test2 : Cron = new Cron("* * * * * *", { timezone: "Europe/Stockholm"}, () => {
	console.log("This will run every second.");
});

// ISO string with options, without function. Plus
const test3 : Cron = new Cron("2023-01-01T00:00:00", { timezone: "Europe/Stockholm"});
test3.schedule(() => {
	console.log("This will run every second.");
});
test3.nextRuns(10);
test3.pause();
test3.resume();
test3.stop();

// Date without options AND scheduled function
const test4 : Cron = new Cron(new Date(2023,0,1,0,0,0));
test4.stop();

// --- New type features ---

// Generic context type: context is typed through the callback
interface MyContext {
	count: number;
	label: string;
}

const test5 = new Cron<MyContext>("* * * * *", {
	context: { count: 0, label: "test" },
	catch: (err: unknown, job: Cron<MyContext>) => {
		// job.options.context is MyContext
		const ctx = job.options.context;
		if (ctx) {
			const _label: string = ctx.label;
		}
	},
}, (self, context) => {
	// context is MyContext
	const _n: number = context.count;
	const _s: string = context.label;
});
test5.stop();

// CronJob<T> convenience alias
const job: CronJob<MyContext> = test5;
job.stop();

// CronCallback type
const myCallback: CronCallback<MyContext> = (self, context) => {
	const _n: number = context.count;
};

// CatchCallbackFn type
const myCatch: CatchCallbackFn<MyContext> = (err, job) => {
	const _opts: CronOptions<MyContext> = job.options;
};

// ProtectCallbackFn type
const myProtect: ProtectCallbackFn = (job) => {
	console.log("skipped", job.name);
};

// CronOptions as standalone type
const opts: CronOptions<{ value: number }> = {
	timezone: "America/New_York",
	maxRuns: 5,
	context: { value: 42 },
	protect: true,
};

// Verify return types
const nextDate: Date | null = test1.nextRun();
const nextDates: Date[] = test1.nextRuns(5);
const pattern: string | undefined = test1.getPattern();
const running: boolean = test1.isRunning();
const stopped: boolean = test1.isStopped();
const busy: boolean = test1.isBusy();
const current: Date | null = test1.currentRun();
const previous: Date | null = test1.previousRun();
const ms: number | null = test1.msToNext();

// CronPatternPart union
const part: CronPatternPart = "second";
