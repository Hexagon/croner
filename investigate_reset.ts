import { CronDate } from "./src/date.ts";
import { CronPattern } from "./src/pattern.ts";

console.log("=== Understanding the reset mechanism ===\n");

const pattern = new CronPattern("0 0 31 12 *");

// Simulate what happens when findNext returns 3 (no match)
// Based on the recurse code, it would:
// 1. Increment the parent (month)
// 2. Reset the current level (day) to -offset

console.log("1. RecursionSteps[1] is for day, with offset 1");
console.log("   When no match found, day is reset to: -offset = -1");

const date = new CronDate(undefined);
date.year = 2023;
date.month = 11; // December
date.day = -1; // Reset value
date.hour = 0;
date.minute = 0;
date.second = 0;
date.ms = 0;

console.log("\n2. Before apply():");
console.log("   year=%d, month=%d, day=%d", date.year, date.month, date.day);

(date as any).apply();

console.log("\n3. After apply():");
console.log("   year=%d, month=%d, day=%d", date.year, date.month, date.day);
console.log("   Date:", date.getDate(false).toISOString());

console.log("\n4. Now findNext will search from this day:");
const offset = 1;
console.log("   Starting from day=%d, offset=%d", date.day, offset);
console.log("   Loop: i from %d to %d", date.day + offset, pattern.day.length - 1);

for (let i = date.day + offset; i < pattern.day.length; i++) {
  if (pattern.day[i]) {
    console.log("   Match at i=%d, pattern.day[%d]=%d", i, i, pattern.day[i]);
    console.log("   Set day to: i - offset = %d - %d = %d", i, offset, i - offset);
    date.day = i - offset;
    break;
  }
}

console.log("\n5. After setting day=%d:", date.day);
(date as any).apply();
console.log("   After apply(): day=%d", date.day);
console.log("   Final date:", date.getDate(false).toISOString());

console.log("\n6. Key insight:");
console.log("   Day -1 normalizes to day 29 (Nov 29)");
console.log("   Then search from day 29+1=30 up to 30 (array length 31, index 0-30)");
console.log("   Match at day[30]=1");
console.log("   Set day to 30-1=29");
console.log("   But we're in December now, so day 29 is Dec 29, NOT Dec 31!");
