import { Cron } from "./src/croner.ts";

// Simulate chained "once" jobs where each job creates the next

const jobs: Cron[] = [];
let executionCount = 0;

function createNextJob(iteration: number) {
  const futureDate = new Date(Date.now() + 1000); // 1 second from now
  console.log(`[${iteration}] Creating job scheduled for:`, futureDate.toISOString());
  
  const job = new Cron(futureDate, () => {
    executionCount++;
    console.log(`[${iteration}] Job fired at:`, new Date().toISOString());
    console.log(`[${iteration}] Previous run:`, job.previousRun());
    console.log(`[${iteration}] Next run:`, job.nextRun());
    
    // Create the next job in the chain
    if (iteration < 5) {
      createNextJob(iteration + 1);
    }
  });
  
  jobs.push(job);
  console.log(`[${iteration}] Job created, next run:`, job.nextRun()?.toISOString());
}

// Start the chain
createNextJob(1);

// Check status after all should have completed
setTimeout(() => {
  console.log("\n=== Final Status ===");
  console.log("Execution count:", executionCount);
  console.log("Expected:", 5);
  
  jobs.forEach((job, idx) => {
    console.log(`Job ${idx + 1}:`, {
      previous: job.previousRun()?.toISOString(),
      next: job.nextRun()?.toISOString()
    });
    job.stop();
  });
}, 7000);
