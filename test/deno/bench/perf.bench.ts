import { Cron as CronDist } from "../../../dist/croner.min.mjs";
import { Cron } from "../../../src/croner.js";

Deno.bench("Enumerate 100 seconds, Dev", { group: "first" }, () => {
	new Cron("* * * * * *").nextRun();
});

Deno.bench("Enumerate 100 seconds, Dist", { group: "first" }, () => {
	new CronDist("* * * * * *").nextRun();
});

Deno.bench("Enumerate 100 sundays (legacy mode), Dev", { group: "second" }, () => {
	new Cron("0 0 0 * * SUN", { legacyMode: true }).nextRun();
});
Deno.bench("Enumerate 100 sundays (legacy mode), Dist", { group: "second" }, () => {
	new CronDist("0 0 0 * * SUN", { legacyMode: true }).nextRun();
});

Deno.bench("Enumerate 100 sundays (croner mode), Dev", { group: "third" }, () => {
	new Cron("0 0 0 * * SUN", { legacyMode: true }).nextRun();
});
Deno.bench("Enumerate 100 sundays (croner mode), Dist", { group: "third" }, () => {
	new CronDist("0 0 0 * * SUN", { legacyMode: true }).nextRun();
});

Deno.bench("Enumerate 100 29th of february (croner mode), Dev", { group: "fourth" }, () => {
	new Cron("0 0 0 29 2 *", { legacyMode: true }).nextRun();
});
Deno.bench("Enumerate 100 29th of february (croner mode), Dist", { group: "fourth" }, () => {
	new CronDist("0 0 0 29 2 *", { legacyMode: true }).nextRun();
});
