import { CronDate } from "./src/date.ts";

const date = new CronDate(undefined);
date.year = 2023;
date.month = 10; // November  
date.day = 31;
date.hour = 0;
date.minute = 0;
date.second = 0;
date.ms = 0;

console.log("Before apply(): Nov 31, 2023");
console.log("  year=%d, month=%d, day=%d", date.year, date.month, date.day);

(date as any).apply();

console.log("\nAfter apply():");
console.log("  year=%d, month=%d, day=%d", date.year, date.month, date.day);
console.log("  Date:", date.getDate(false).toISOString());
