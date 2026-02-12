import { Cron } from "./src/croner.ts";

// Test: create a job that's scheduled to run very soon (potential race condition)

let executionCount = 0;

for (let i = 0; i < 10; i++) {
  // Create jobs that should run in 50ms increments
  const futureDate = new Date(Date.now() + (i * 50) + 100);
  
  const job = new Cron(futureDate, { name: `test-${i}` }, () => {
    executionCount++;
    console.log(`Job ${i} fired at ${new Date().toISOString()}, scheduled for ${futureDate.toISOString()}`);
  });
  
  console.log(`Job ${i} created:`, {
    once: job.getOnce()?.toISOString(),
    next: job.nextRun()?.toISOString(),
    isRunning: job.isRunning()
  });
}

setTimeout(() => {
  console.log("\n=== Final Status ===");
  console.log("Execution count:", executionCount, "/ 10");
}, 2000);
