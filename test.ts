import { Cron as oldCron } from "@hexagon/croner";
import { Cron as newCron } from "./src/croner.ts";
let nextRunsNew = new newCron("@hourly").nextRuns(3, "2022-02-16T23:59:00");
console.log(nextRunsNew[0].getHours());
let nextRunsOld = new newCron("@hourly").nextRuns(3, "2022-02-16T23:59:00");
console.log(nextRunsOld[0].getHours());