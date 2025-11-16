import { CronDate } from "./src/date.ts";
import { CronPattern } from "./src/pattern.ts";

const pattern = new CronPattern("0 0 31 12 *");

console.log("=== Tracing backward recursion for Dec 31 ===\n");

// Start from Dec 30, 23:59:59 (after decrementing from Dec 31 00:00:00)
const date = new CronDate(undefined);
date.year = 2023;
date.month = 11; // December
date.day = 30;
date.hour = 23;
date.minute = 59;
date.second = 59;

console.log("Start: Dec 30, 2023 23:59:59");

console.log("\n1. Check month (doing=0):");
console.log("   Current month: 11 (December)");
console.log("   Pattern wants: 11 (December)");
console.log("   Result: match (return 1)");

console.log("\n2. Check day (doing=1):");
console.log("   Current day: 30");
console.log("   Pattern day[30]=1, which with offset -1 means day 31");
console.log("   findPrevious searches from i=29 down to 0");
console.log("   No match found (return 3)");

console.log("\n3. Day returned 3, so:");
console.log("   - Decrement month: 11 -> 10 (November)");
console.log("   - apply() normalizes: still November");
console.log("   - getMaxPatternValue returns: 31");
console.log("   - But November only has 30 days!");
console.log("   - With my fix: Math.min(31, 30) = 30");
console.log("   - Set day = 30");
console.log("   - apply(): Nov 30 is valid, stays as Nov 30");

console.log("\n4. Restart from doing=0 with Nov 30:");
console.log("   - Check month: 10 (Nov), pattern wants 11 (Dec)");
console.log("   - No match, return 3");
console.log("   - Decrement month: 10 -> 9 (October)");
console.log("   - Set day = min(31, 31) = 31");
console.log("   - Continue...");

console.log("\n5. Eventually reach December of PREVIOUS year");
console.log("   - Month matches (December)");
console.log("   - Day: current=30, pattern wants 31");
console.log("   - Same situation, will loop forever!");

console.log("\n6. The REAL issue:");
console.log("   When month DOES match but day doesn't,");
console.log("   we decrement to previous month");
console.log("   But when we come back to December, we're at day 30 again!");
