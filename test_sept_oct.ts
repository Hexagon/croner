import { CronDate } from "./src/date.ts";

const date = new CronDate(undefined);
date.year = 2023;
date.month = 9; // October
date.day = 31;

console.log("Before decrement: Oct 31, 2023");
console.log("  year=%d, month=%d, day=%d", date.year, date.month, date.day);

date.month--;
console.log("\nAfter month--: month=%d", date.month);

(date as any).apply();
console.log("\nAfter apply():");
console.log("  year=%d, month=%d, day=%d", date.year, date.month, date.day);
console.log("  Date:", date.getDate(false).toISOString());
