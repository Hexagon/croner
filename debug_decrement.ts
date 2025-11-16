import { CronDate } from "./src/date.ts";
import { CronPattern } from "./src/pattern.ts";

const pattern = new CronPattern("0 0 31 12 *");

console.log("=== Testing decrement from Dec 31 00:00:00 ===\n");

const date = new CronDate(new Date("2023-12-31T00:00:00Z"));
console.log("Start: y=%d, m=%d, d=%d, h=%d, min=%d, s=%d", 
  date.year, date.month, date.day, date.hour, date.minute, date.second);

const result = date.decrement(pattern, {});
if (result) {
  console.log("\nAfter decrement: y=%d, m=%d, d=%d, h=%d, min=%d, s=%d",
    result.year, result.month, result.day, result.hour, result.minute, result.second);
  console.log("Full date:", result.getDate(false).toISOString());
  
  console.log("\nExpected: 2022-12-31T00:00:00.000Z");
  console.log("Match:", result.getDate(false).toISOString() === "2022-12-31T00:00:00.000Z" ? "✓" : "✗");
} else {
  console.log("\nResult: null");
}
