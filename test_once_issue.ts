import { Cron } from "./src/croner.ts";

// Simulate the issue: create a "once" job that should fire, but doesn't

// Create a date in the future
const futureDate = new Date(Date.now() + 2000); // 2 seconds from now
console.log("Creating job scheduled for:", futureDate.toISOString());

let jobFired = false;
const job = new Cron(futureDate, () => {
  jobFired = true;
  console.log("Job fired at:", new Date().toISOString());
  console.log("Previous run:", job.previousRun());
  console.log("Next run:", job.nextRun());
});

console.log("Job created");
console.log("getOnce():", job.getOnce()?.toISOString());
console.log("getPattern():", job.getPattern());
console.log("Next run:", job.nextRun());
console.log("Previous run:", job.previousRun());

// Wait and check if it fired
setTimeout(() => {
  console.log("\n=== After 3 seconds ===");
  console.log("Job fired?", jobFired);
  console.log("Previous run:", job.previousRun()?.toISOString());
  console.log("Next run:", job.nextRun());
  job.stop();
}, 3000);
