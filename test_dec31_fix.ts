import { Cron } from "./src/croner.ts";

console.log("=== Testing Dec 31 pattern fix ===\n");

const job = new Cron("0 0 31 12 *");

console.log("1. Test previousRuns(3) from Jan 15, 2024:");
try {
  const runs = job.previousRuns(3, new Date("2024-01-15T12:00:00Z"));
  console.log("   ✓ Success! Got", runs.length, "runs:");
  runs.forEach((r, i) => {
    const expected = ["2023-12-31T00:00:00.000Z", "2022-12-31T00:00:00.000Z", "2021-12-31T00:00:00.000Z"][i];
    const match = r.toISOString() === expected ? "✓" : "✗";
    console.log(`   [${i}]: ${r.toISOString()} ${match}`);
  });
} catch (e) {
  console.log("   ✗ Error:", e.message);
}

console.log("\n2. Test previousRuns(5) from Dec 31, 2023:");
try {
  const runs = job.previousRuns(5, new Date("2023-12-31T00:00:00Z"));
  console.log("   ✓ Success! Got", runs.length, "runs:");
  runs.forEach((r, i) => console.log(`   [${i}]: ${r.toISOString()}`));
} catch (e) {
  console.log("   ✗ Error:", e.message);
}

console.log("\n3. Test backward compatibility with nextRuns:");
const next = job.nextRuns(3, new Date("2023-01-01T00:00:00Z"));
console.log("   nextRuns from Jan 1, 2023:");
next.forEach((r, i) => console.log(`   [${i}]: ${r.toISOString()}`));
