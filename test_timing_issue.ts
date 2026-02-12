import { Cron } from "./src/croner.ts";

// Test: create a job scheduled for "now" or in the very near past

const cases = [
  { name: "Past (5ms ago)", offset: -5 },
  { name: "Now (0ms)", offset: 0 },
  { name: "Future (5ms)", offset: 5 },
  { name: "Future (50ms)", offset: 50 },
  { name: "Future (500ms)", offset: 500 },
];

for (const testCase of cases) {
  const scheduleTime = new Date(Date.now() + testCase.offset);
  console.log(`\n=== ${testCase.name} ===`);
  console.log("Schedule time:", scheduleTime.toISOString());
  console.log("Current time:", new Date().toISOString());
  
  let fired = false;
  const job = new Cron(scheduleTime, () => {
    fired = true;
    console.log("  -> Job FIRED at", new Date().toISOString());
  });
  
  console.log("Next run:", job.nextRun()?.toISOString());
  console.log("Is running:", job.isRunning());
  
  // Wait a bit to see if it fires
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log("After 100ms - Fired?", fired);
  job.stop();
}

console.log("\n=== Test complete ===");
