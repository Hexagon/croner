import { Cron } from "./src/croner.ts";

const job = new Cron("0 0 31 12 *");

console.log("=== Debugging duplicate dates ===\n");

console.log("Starting from: 2024-01-15T12:00:00Z");
let ref: any = new Date("2024-01-15T12:00:00Z");

for (let i = 0; i < 5; i++) {
  const prev = (job as any)._previous(ref);
  if (prev) {
    const dateStr = prev.getDate(false).toISOString();
    console.log(`Call ${i + 1}: ${dateStr}`);
    console.log(`  CronDate: y=${prev.year}, m=${prev.month}, d=${prev.day}, h=${prev.hour}, min=${prev.minute}, s=${prev.second}`);
    ref = prev;
  } else {
    console.log(`Call ${i + 1}: null`);
    break;
  }
}
