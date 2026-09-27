import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

/**
 * Regression tests for #343/#370: croner used to read the system clock several
 * times while arming and running a scheduled occurrence. A forward clock step
 * (NTP correction, WSL2 host clock resync, ...) between two of those reads made
 * it re-arm for the occurrence after the one just stepped over, so the
 * occurrence was silently skipped: no fire, no error.
 *
 * The step is injected by patching Date: within a configurable window before
 * the occurrence, the clock jumps forward across it on the second consecutive
 * read. Dates built from an explicit timestamp bypass the patch, so job inputs
 * can be constructed while it is active.
 */

/** Whole-second occurrence `seconds` out, so the job fires on a second boundary */
function targetSecondsOut(RealDate: DateConstructor, seconds: number): number {
  const target = new RealDate();
  target.setSeconds(target.getSeconds() + seconds, 0);
  return target.getTime();
}

/**
 * Patch globalThis.Date so the clock jumps forward across targetMs on the
 * second consecutive read within `windowMs` before it. Returns a restore fn.
 */
function patchClockToStepAcross(
  RealDate: DateConstructor,
  targetMs: number,
  windowMs = 30_000,
): () => void {
  let offsetMs = 0, jumped = false, lastReadInWindow = false;
  const readClock = (): number => {
    const gap = targetMs - (RealDate.now() + offsetMs);
    const inWindow = gap > 0 && gap <= windowMs;
    // Step the clock across the occurrence on the second consecutive read in
    // the window, mimicking a step between croner's arming reads
    if (!jumped && inWindow && lastReadInWindow) {
      jumped = true;
      offsetMs += gap + 5_000;
    }
    lastReadInWindow = inWindow;
    return RealDate.now() + offsetMs;
  };

  // deno-lint-ignore no-explicit-any
  const PatchedDate = class extends (RealDate as any) {
    // deno-lint-ignore no-explicit-any
    constructor(...args: any[]) {
      super(args.length === 0 ? readClock() : args[0], ...args.slice(1));
    }

    static now(): number {
      return readClock();
    }
  };

  globalThis.Date = PatchedDate as unknown as DateConstructor;
  return () => {
    globalThis.Date = RealDate;
  };
}

/**
 * Start a job while the clock is patched to step across its occurrence, then
 * assert it fires exactly `expectedFires` times.
 *
 * The occurrence is ~2 s out — inside the default 30 s step window, while
 * keeping the whole test under bun:test's 5 s default timeout, which
 * @cross/test cannot raise.
 *
 * `runsRecordedWithinMs` (past the occurrence), when set, additionally asserts
 * that every fired run was recorded at its own occurrence time: a run recorded
 * past the injected step (+5 s) means the clock step advanced the recorded run
 * time, the failure mode the single-read arming cycle guards against.
 */
async function assertFiresDespiteClockStep(
  start: (targetMs: number, onFire: () => void) => Cron,
  {
    expectedFires = 1,
    windowMs = 30_000,
    runsRecordedWithinMs,
  }: {
    expectedFires?: number;
    windowMs?: number;
    runsRecordedWithinMs?: number;
  } = {},
) {
  const RealDate = Date;
  const targetMs = targetSecondsOut(RealDate, 2);

  let fired = 0;
  const recordedRuns: number[] = [];
  const restoreClock = patchClockToStepAcross(RealDate, targetMs, windowMs);
  let job: Cron | undefined;
  try {
    job = start(targetMs, () => {
      fired++;
      // currentRun is anchored before the callback runs, so this is the time
      // croner recorded for the firing occurrence
      recordedRuns.push(job?.currentRun()?.getTime() ?? Number.NaN);
    });

    // Poll until the expected count, or 1.5 s past the occurrence: a build
    // that skips it stays unfired until the deadline and still fails below
    const deadline = targetMs + 1_500;
    while (RealDate.now() < deadline && fired < expectedFires) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    // Give same-tick duplicate fires a moment to surface before asserting
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    assertEquals(
      fired,
      expectedFires,
      fired < expectedFires
        ? "occurrence silently skipped: the clock stepped forward across it " +
          "between croner's arming reads"
        : "job fired more times than scheduled",
    );

    if (runsRecordedWithinMs !== undefined) {
      for (const runMs of recordedRuns) {
        assert(
          runMs <= targetMs + runsRecordedWithinMs,
          `run recorded at +${runMs - targetMs} ms past the occurrence — the clock step ` +
            "advanced the recorded run time instead of firing the occurrence late",
        );
      }
    }
  } finally {
    restoreClock();
    job?.stop();
  }
}

test("clock step forward between arming reads must not skip the occurrence", () =>
  assertFiresDespiteClockStep((targetMs, onFire) =>
    new Cron(new Date(targetMs).getSeconds() + " * * * * *", onFire)
  ));

test("clock step forward between arming reads must not skip the occurrence (startAt + interval)", () =>
  assertFiresDespiteClockStep((targetMs, onFire) => {
    // Same race through _calculatePreviousRun(): it used to sample the clock
    // on its own, so a forward step between schedule()'s reading and the walk
    // advanced the walk past the pending run
    return new Cron("* * * * * *", { startAt: new Date(targetMs - 10_000), interval: 5 }, onFire);
  }));

test("clock step forward between the trigger check and the run must not skip or misdate the occurrence", () =>
  assertFiresDespiteClockStep(
    (_targetMs, onFire) => new Cron("* * * * * *", onFire),
    {
      // Arming is single-read, so the step is injected one read later: the 1 s
      // window keeps the arming read (> 1 s out) outside the jump zone but
      // includes the check read of the occurrence ~1 s before the target. The
      // run used to sample the clock again right after that check, so the step
      // landed between the two reads and the run was recorded past it. Both
      // occurrences must fire, each recorded at its own occurrence time — not
      // at a post-step reading (target + 5 s), which is what a misdated run
      // looks like.
      expectedFires: 2,
      windowMs: 1_000,
      runsRecordedWithinMs: 2_500,
    },
  ));
