import { CronDate } from "./src/date.ts";
import { CronPattern } from "./src/pattern.ts";

const pattern = new CronPattern("0 0 31 12 *");
const date = new CronDate(undefined);
date.year = 2023;
date.month = 10; // November
date.day = 1;
date.hour = 0;
date.minute = 0;
date.second = 0;

console.log("Pattern day array:");
for (let i = 0; i < pattern.day.length; i++) {
  if (pattern.day[i]) {
    console.log(`  day[${i}] = ${pattern.day[i]}`);
  }
}

const offset = -1; // From RecursionSteps
console.log("\nCalling getMaxPatternValue for day with offset", offset);
const maxVal = (date as any).getMaxPatternValue("day", pattern, offset);
console.log("Result:", maxVal);

console.log("\nExpected: 31 (since pattern.day[30]=1 and 30-(-1)=31)");
