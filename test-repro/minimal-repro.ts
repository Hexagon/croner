/**
 * Minimal reproduction for Node.js test framework issue
 *
 * Tests pass in Deno but fail in Node.js with "asynchronous activity after test ended" errors.
 * The actual assertion values are also incorrect in Node.js.
 *
 * Issue: Node.js tests report wrong timestamps (off by ~23 hours) for timezone-related tests
 * when using patterns without year constraints.
 *
 * Expected behavior: Tests should pass in all runtimes (Deno, Node.js, Bun)
 * Actual behavior: Tests pass in Deno and Bun, but fail in Node.js
 */

import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("Minimal repro: UTC timezone test", function () {
  const testjob = new Cron("0 0 * * * *", {
    paused: true,
    timezone: "UTC",
  });

  // Test from 2025-10-05T00:00:00Z, expecting next run at 01:00:00
  const nextRunDate = testjob.nextRun("2025-10-05T00:00:00Z");
  const expected = 1759626000000; // 2025-10-05T01:00:00.000Z

  console.log("Expected:", expected, new Date(expected).toISOString());
  console.log("Got:     ", nextRunDate?.getTime(), nextRunDate?.toISOString());

  assertEquals(nextRunDate?.getTime(), expected, `Failed for 2025-10-05T00:00:00Z`);

  testjob.stop();
});

test("Minimal repro: DST Overlap test", function () {
  const nyJob = new Cron("0 30 1 * * *", { paused: true, timezone: "America/New_York" });

  // First occurrence: 1:30 AM EDT = 2025-11-02T05:30:00.000Z
  const nov2First = nyJob.nextRun("2025-11-02T04:00:00Z");
  const expected = "2025-11-02T05:30:00.000Z";

  console.log("Expected:", expected);
  console.log("Got:     ", nov2First?.toISOString());

  assertEquals(nov2First?.toISOString(), expected);

  nyJob.stop();
});

test("Minimal repro: Europe/London DST test", function () {
  const londonSpring = new Cron("0 30 1 * * *", { paused: true, timezone: "Europe/London" });

  const march30 = londonSpring.nextRun("2025-03-30T00:00:00Z");
  const expected = "2025-03-30T01:30:00.000Z";

  console.log("Expected:", expected);
  console.log("Got:     ", march30?.toISOString());

  // Should skip to 2:30 AM BST (not 1:30 AM which doesn't exist)
  // 2:30 AM BST on March 30 = 2025-03-30T01:30:00.000Z
  assertEquals(march30?.toISOString(), expected);

  londonSpring.stop();
});
