import { CronPattern } from "./src/pattern.ts";

const pattern = new CronPattern("0 0 31 12 *");

console.log("Pattern for '0 0 31 12 *':");

// Check which months are set
console.log("\nMonths set to 1:");
for (let i = 0; i < pattern.month.length; i++) {
  if (pattern.month[i] === 1) {
    console.log(`  month[${i}] = 1 (month index ${i})`);
  }
}

console.log("\nDays set to 1:");
for (let i = 0; i < pattern.day.length; i++) {
  if (pattern.day[i] === 1) {
    console.log(`  day[${i}] = 1`);
  }
}
