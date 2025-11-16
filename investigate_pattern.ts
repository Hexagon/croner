import { CronPattern } from "./src/pattern.ts";
import { CronDate } from "./src/date.ts";

console.log("=== Investigating how day patterns work ===\n");

// Test pattern "0 0 31 12 *"
const pattern = new CronPattern("0 0 31 12 *");

console.log("1. Pattern array for day:");
console.log("   day.length:", pattern.day.length);
for (let i = 0; i < pattern.day.length; i++) {
  if (pattern.day[i]) {
    console.log(`   day[${i}] = ${pattern.day[i]}`);
  }
}

console.log("\n2. RecursionSteps for day:");
// RecursionSteps is likely defined somewhere - let's check what offset is used
// For now, let's test what happens with different offsets

console.log("\n3. Testing findNext with day pattern:");
const date = new CronDate(new Date("2023-12-30T12:00:00Z"));
console.log("   Starting from:", date.year, date.month, date.day);

// Manually test what findNext would do
const offset = 1; // This is the offset from RecursionSteps
console.log("   Offset:", offset);
console.log("   Loop would check from i =", date.day + offset, "to", pattern.day.length - 1);

for (let i = date.day + offset; i < pattern.day.length; i++) {
  const match = pattern.day[i];
  if (match) {
    console.log(`   Found match at i=${i}, pattern.day[${i}]=${match}`);
    console.log(`   Would set day to: i - offset = ${i} - ${offset} = ${i - offset}`);
    break;
  }
}

console.log("\n4. Testing actual increment:");
const testDate = new CronDate(new Date("2023-12-30T12:00:00Z"));
const result = testDate.increment(pattern, {});
if (result) {
  console.log("   Result: year=%d, month=%d, day=%d", result.year, result.month, result.day);
  console.log("   Full date:", result.getDate(false).toISOString());
}

console.log("\n5. Understanding the offset logic:");
console.log("   If pattern.day[30] = 1, and offset = 1:");
console.log("   - Loop checks i=30");
console.log("   - Sets this.day = i - offset = 30 - 1 = 29");
console.log("   - BUT the result shows day 31!");
console.log("   - So there must be normalization happening AFTER...");

console.log("\n6. Test with day=29 before normalization:");
const normalizeTest = new CronDate(undefined);
normalizeTest.year = 2023;
normalizeTest.month = 11; // December
normalizeTest.day = 29;
normalizeTest.hour = 0;
normalizeTest.minute = 0;
normalizeTest.second = 0;
normalizeTest.ms = 0;
console.log("   Before apply(): day=%d", normalizeTest.day);
(normalizeTest as any).apply();
console.log("   After apply(): day=%d", normalizeTest.day);
console.log("   Date:", normalizeTest.getDate(false).toISOString());
