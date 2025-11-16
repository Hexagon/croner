import { CronPattern } from "./src/pattern.ts";

console.log("=== Understanding with CORRECT offset ===\n");

const pattern = new CronPattern("0 0 31 12 *");

console.log("1. RecursionSteps for day:");
console.log('   ["day", "month", -1]');
console.log("   Offset is -1, NOT 1!");

console.log("\n2. Pattern array:");
for (let i = 0; i < pattern.day.length; i++) {
  if (pattern.day[i]) {
    console.log(`   pattern.day[${i}] = ${pattern.day[i]}`);
  }
}

console.log("\n3. In findNext, when checking day 30:");
const offset = -1; // CORRECT offset
const currentDay = 30;
console.log("   Loop: i from", currentDay + offset, "to", pattern.day.length - 1);
console.log("   That's i from", currentDay + offset, "to 30");

for (let i = currentDay + offset; i < pattern.day.length; i++) {
  if (pattern.day[i]) {
    console.log(`   Match at i=${i}`);
    console.log(`   Set day to: i - offset = ${i} - (${offset}) = ${i} - (${offset}) = ${i + 1}`);
    break;
  }
}

console.log("\n4. So the formula is:");
console.log("   this.day = i - offset");
console.log("   With offset=-1: this.day = i - (-1) = i + 1");
console.log("   So pattern.day[30]=1 means: day = 30 + 1 = 31");
console.log("   That's correct!");

console.log("\n5. For findPrevious (backward), starting from day 30:");
console.log("   Loop: i from", currentDay + offset, "down to 0");
console.log("   That's i from 29 down to 0");
console.log("   We check pattern.day[29], pattern.day[28], ...");
console.log("   But pattern.day[30]=1 is never checked!");
console.log("   That's the bug!");

console.log("\n6. The fix:");
console.log("   In findPrevious for day, we need to search from the END of the valid range");
console.log("   Not from current+offset, but from the LAST DAY OF THE MONTH + offset");
console.log("   For December: lastDay=31, so search from 31+(-1)=30 down to 0");
