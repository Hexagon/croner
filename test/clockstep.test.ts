import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("a forward clock step while arming must not skip the scheduled occurrence", async () => {
  const RealDate = Date;
  const target = new RealDate();
  target.setSeconds(target.getSeconds() + 2, 0);
  const targetMs = target.getTime();

  let clockReads = 0;
  let offsetMs = 0;
  const PatchedDate = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      if (args.length === 0) {
        clockReads++;
        if (clockReads === 2) {
          const now = RealDate.now() + offsetMs;
          offsetMs += Math.max(targetMs - now, 0) + 5_000;
        }
        return Reflect.construct(target, [RealDate.now() + offsetMs], newTarget);
      }
      return Reflect.construct(target, args, newTarget);
    },
  });

  let fired = 0;
  const job = new Cron(`${target.getSeconds()} * * * * *`);
  globalThis.Date = PatchedDate;
  try {
    job.schedule(() => {
      fired++;
    });

    const deadline = targetMs + 1_200;
    while (RealDate.now() < deadline && fired === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    assertEquals(fired, 1, "the stepped-over occurrence should fire once");
  } finally {
    globalThis.Date = RealDate;
    job.stop();
  }
});
