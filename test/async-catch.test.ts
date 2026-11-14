import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";
import { sleep } from "./utils.ts";

for (const asynchronous of [true, false]) {
  test(
    `Catch callback ${asynchronous ? "async" : "thenable"} rejection should be ignored`,
    async () => {
      const original = new Error("Job failed");
      const delivered: unknown[][] = [];
      const failure = new Error("Catch callback failed");
      let thenCalls = 0;
      const job = new Cron("* * * * * *", {
        paused: true,
        protect: true,
        catch: asynchronous
          ? async (error, currentJob) => {
            delivered.push([error, currentJob]);
            await Promise.resolve();
            throw failure;
          }
          : (error, currentJob) => {
            delivered.push([error, currentJob]);
            const rejection = Promise.resolve().then(() => {
              throw failure;
            });
            return {
              then(resolve: () => void, reject: (reason: unknown) => void) {
                thenCalls++;
                return rejection.then(resolve, reject);
              },
            };
          },
      }, () => {
        throw original;
      });
      try {
        await job.trigger();
        // Let the runtime report an unhandled rejection if the boundary missed it.
        await sleep(20);
        assertEquals(delivered.length, 1);
        assertEquals(thenCalls, asynchronous ? 0 : 1);
        assertEquals(delivered[0][0] === original, true);
        assertEquals(delivered[0][1] === job, true);
        assertEquals(job.isBusy(), false);
      } finally {
        job.stop();
      }
    },
  );
}

test("Pending catch callback should not delay trigger or keep the job busy", async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let catchFinished = false;
  const job = new Cron("* * * * * *", {
    paused: true,
    protect: true,
    catch: async () => {
      await pending;
      catchFinished = true;
    },
  }, () => {
    throw new Error("Job failed");
  });
  let triggerDone = false;
  const triggered = job.trigger().then(() => {
    triggerDone = true;
  });
  try {
    await sleep(20);
    assertEquals(triggerDone, true);
    assertEquals(catchFinished, false);
    assertEquals(job.isBusy(), false);
  } finally {
    release();
    await triggered;
    job.stop();
  }
});

test("Pending catch callback should not block a later scheduled run with protect", async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let firstRun!: () => void;
  const started = new Promise<void>((resolve) => {
    firstRun = resolve;
  });
  let runs = 0;
  const job = new Cron("* * * * * *", {
    protect: true,
    catch: async () => {
      await pending;
    },
  }, () => {
    runs++;
    firstRun();
    throw new Error("Job failed");
  });
  try {
    await started;
    await sleep(1100);
    assertEquals(runs >= 2, true);
    assertEquals(job.isBusy(), false);
  } finally {
    job.stop();
    release();
    await pending;
  }
});
