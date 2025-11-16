import { CronDate } from "./src/date.ts";
import { CronPattern } from "./src/pattern.ts";

const pattern = new CronPattern("0 0 31 12 *");

console.log("=== What happens when we cycle through all months? ===\n");

const date = new CronDate(undefined);
date.year = 2023;
date.month = 11; // December
date.day = 30;
date.hour = 0;
date.minute = 0;
date.second = 0;

console.log("Start: Dec 30, 2023");

// Simulate the backward recursion manually
for (let i = 0; i < 15; i++) {
  console.log(`\nIteration ${i}: month=${date.month}, day=${date.day}, year=${date.year}`);
  
  // Check if month matches
  if (pattern.month[date.month] === 1) {
    console.log("  Month matches (December)");
    // Check day: pattern wants day 31, we're at day 30
    // findPrevious returns 3
    console.log("  Day doesn't match, decrement month");
  } else {
    console.log("  Month doesn't match, decrement month");
  }
  
  // Decrement month
  date.month--;
  (date as any).apply();
  
  // Set day to max
  const lastDay = new Date(Date.UTC(date.year, date.month + 1, 0)).getUTCDate();
  const maxDay = Math.min(31, lastDay);
  date.day = maxDay;
  (date as any).apply();
  
  console.log(`  After decrement: month=${date.month}, day=${date.day}, year=${date.year}`);
  
  if (date.year < 2022) break;
}
