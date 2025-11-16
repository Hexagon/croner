import { CronDate } from "./src/date.ts";

console.log("=== Finding the correct reset value for day ===\n");

// When incrementing month and resetting day, what value gives us day 1?
console.log("1. Test different day values in December:");

for (let dayVal of [0, 1, 2]) {
  const date = new CronDate(undefined);
  date.year = 2023;
  date.month = 11; // December
  date.day = dayVal;
  date.hour = 0;
  date.minute = 0;
  date.second = 0;
  date.ms = 0;
  
  (date as any).apply();
  console.log("   day=%d -> after apply: %s (day %d)", dayVal, date.getDate(false).toISOString().substring(0, 10), date.day);
}

console.log("\n2. JavaScript Date behavior:");
console.log("   new Date(2023, 11, 0) =", new Date(Date.UTC(2023, 11, 0)).toISOString().substring(0, 10));
console.log("   new Date(2023, 11, 1) =", new Date(Date.UTC(2023, 11, 1)).toISOString().substring(0, 10));

console.log("\n3. So offset=1 means:");
console.log("   Reset day to 0 to get the PREVIOUS month's last day");
console.log("   Then search from day 0+1=1 up through the array");
console.log("   When we find a match at i, we set day = i - 1");
console.log("   This gives us the actual day number!");

console.log("\n4. For day 31 pattern:");
console.log("   pattern.day[30] = 1 (index 30)");
console.log("   When i=30, we set day = 30 - 1 = 29");
console.log("   But wait, that's day 29, not 31!");

console.log("\n5. Let's trace through the actual increment from Dec 29:");
const date = new CronDate(new Date("2023-12-29T12:00:00Z"));
console.log("   Start: year=%d, month=%d, day=%d", date.year, date.month, date.day);

// Increment by 1 second
date.second++;
(date as any).apply();
console.log("   After +1s: year=%d, month=%d, day=%d", date.year, date.month, date.day);

// Now recurse would search for next match
// Starting from day 29, offset 1, search from i=30
console.log("   Search from i=%d to %d", date.day + 1, 30);
console.log("   Found at i=30, set day to 30-1=29");

// But that's the same! So it must increment hour, minute, second to 0
console.log("   Since day didn't change (findNext returns 1), continue to next level");
