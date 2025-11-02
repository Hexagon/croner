/**
 * Debug test for Node.js timezone issues
 * This test provides detailed output to understand why tests fail in GitHub CI
 */

import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Helper to log detailed debugging info
function debugLog(message: string, data?: any) {
  console.log(`[DEBUG] ${message}`);
  if (data !== undefined) {
    console.log(`[DEBUG]   ${JSON.stringify(data, null, 2)}`);
  }
}

test("Debug: System timezone and environment", function () {
  debugLog("=== SYSTEM ENVIRONMENT ===");
  debugLog("Date.now()", Date.now());
  debugLog("new Date().toString()", new Date().toString());
  debugLog("new Date().toISOString()", new Date().toISOString());
  debugLog("new Date().getTimezoneOffset()", new Date().getTimezoneOffset());
  
  // Check environment variables that might affect timezone
  try {
    // @ts-ignore - Deno specific
    if (typeof Deno !== "undefined") {
      debugLog("Runtime: Deno");
      // @ts-ignore
      debugLog("Deno.env.get('TZ')", Deno.env.get("TZ"));
    }
  } catch {
    debugLog("Runtime: Not Deno (likely Node.js)");
  }
  
  try {
    // @ts-ignore - Node specific
    if (typeof process !== "undefined") {
      debugLog("Runtime: Node.js");
      // @ts-ignore
      debugLog("process.version", process.version);
      // @ts-ignore
      debugLog("process.env.TZ", process.env.TZ);
    }
  } catch {
    // Not Node
  }
});

test("Debug: Intl.DateTimeFormat behavior for UTC", function () {
  debugLog("=== INTL.DATETIMEFORMAT TESTING ===");
  
  const testDate = new Date("2025-10-05T00:00:00Z");
  debugLog("Test date", testDate.toISOString());
  
  // Test with shortOffset
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    const formatted = fmt.format(testDate);
    debugLog("Formatted (shortOffset)", formatted);
    
    const parts = fmt.formatToParts(testDate);
    debugLog("formatToParts result", parts);
    
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    debugLog("timeZoneName part found", !!tzPart);
    debugLog("timeZoneName value", tzPart?.value);
    debugLog("timeZoneName value (typeof)", typeof tzPart?.value);
    
    const label = (tzPart?.value || "").replace(/\s/g, "");
    debugLog("Cleaned label", label);
    debugLog("Label length", label.length);
    debugLog("Label === ''", label === "");
    debugLog("/^(GMT|UTC)$/i.test(label)", /^(GMT|UTC)$/i.test(label));
  } catch (e) {
    debugLog("ERROR in shortOffset test", String(e));
  }
  
  // Test fallback format
  try {
    const fallbackFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    
    const fallbackParts = fallbackFmt.formatToParts(testDate);
    debugLog("Fallback formatToParts", fallbackParts);
    
    const map: Record<string, number> = {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
    };
    for (const p of fallbackParts) {
      if (p.type in map) {
        map[p.type] = parseInt(p.value, 10);
      }
    }
    debugLog("Parsed components", map);
  } catch (e) {
    debugLog("ERROR in fallback test", String(e));
  }
});

test("Debug: Cron nextRun calculation step-by-step", function () {
  debugLog("=== CRON NEXTRUN TESTING ===");
  
  const cron = new Cron("0 0 * * * *", {
    paused: true,
    timezone: "UTC",
  });
  
  const inputStr = "2025-10-05T00:00:00Z";
  debugLog("Input string", inputStr);
  debugLog("Input as Date", new Date(inputStr).toISOString());
  debugLog("Input timestamp", new Date(inputStr).getTime());
  
  const result = cron.nextRun(inputStr);
  
  debugLog("Result ISO", result?.toISOString());
  debugLog("Result timestamp", result?.getTime());
  debugLog("Result UTC string", result?.toUTCString());
  
  const expected = 1759626000000;
  debugLog("Expected timestamp", expected);
  debugLog("Expected ISO", new Date(expected).toISOString());
  
  const match = result?.getTime() === expected;
  debugLog("Match", match);
  
  if (!match) {
    const diff = (result?.getTime() || 0) - expected;
    debugLog("DIFFERENCE (ms)", diff);
    debugLog("DIFFERENCE (hours)", diff / 1000 / 60 / 60);
    debugLog("DIFFERENCE (days)", diff / 1000 / 60 / 60 / 24);
  }
  
  cron.stop();
  
  // This assertion might fail, but we want the debug output first
  assertEquals(result?.getTime(), expected, `Failed for ${inputStr}`);
});

test("Debug: Multiple consecutive nextRun calls", function () {
  debugLog("=== CONSECUTIVE NEXTRUN CALLS ===");
  
  const cron = new Cron("0 0 * * * *", {
    paused: true,
    timezone: "UTC",
  });
  
  const testCases = [
    { from: "2025-10-05T00:00:00Z", expected: 1759626000000 },
    { from: "2025-10-05T01:00:00Z", expected: 1759629600000 },
    { from: "2025-10-05T02:00:00Z", expected: 1759633200000 },
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    debugLog(`\nTest case ${i + 1}:`, tc.from);
    
    const result = cron.nextRun(tc.from);
    const match = result?.getTime() === tc.expected;
    
    debugLog("  Result", result?.toISOString());
    debugLog("  Expected", new Date(tc.expected).toISOString());
    debugLog("  Match", match);
    
    if (!match) {
      const diff = (result?.getTime() || 0) - tc.expected;
      debugLog("  DIFF (hours)", diff / 1000 / 60 / 60);
    }
    
    assertEquals(result?.getTime(), tc.expected, `Failed for ${tc.from}`);
  }
  
  cron.stop();
});

test("Debug: DST Overlap test (America/New_York)", function () {
  debugLog("=== DST OVERLAP TEST ===");
  
  const nyJob = new Cron("0 30 1 * * *", { paused: true, timezone: "America/New_York" });
  
  const input = "2025-11-02T05:31:00Z";
  debugLog("Input", input);
  
  const result = nyJob.nextRun(input);
  debugLog("Result", result?.toISOString());
  
  const expected = "2025-11-03T06:30:00.000Z";
  debugLog("Expected", expected);
  
  const match = result?.toISOString() === expected;
  debugLog("Match", match);
  
  if (!match) {
    debugLog("ERROR: Result doesn't match expected!");
  }
  
  nyJob.stop();
  
  assertEquals(result?.toISOString(), expected);
});

test("Debug: Europe/London DST test", function () {
  debugLog("=== EUROPE/LONDON DST TEST ===");
  
  const londonSpring = new Cron("0 30 1 * * *", { paused: true, timezone: "Europe/London" });
  
  const input = "2025-03-30T00:00:00Z";
  debugLog("Input", input);
  
  const result = londonSpring.nextRun(input);
  debugLog("Result", result?.toISOString());
  
  const expected = "2025-03-30T01:30:00.000Z";
  debugLog("Expected", expected);
  
  const match = result?.toISOString() === expected;
  debugLog("Match", match);
  
  if (!match) {
    debugLog("ERROR: Result doesn't match expected!");
  }
  
  londonSpring.stop();
  
  assertEquals(result?.toISOString(), expected);
});
