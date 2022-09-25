import { Cron } from "../../../src/croner.js";

Deno.bench("Enumerate 100 seconds", { group: "url" }, () => {
  new Cron("* * * * * *").enumerate(100);
});

Deno.bench("Enumerate 100 sundays (legacy mode)", { group: "url" }, () => {
  new Cron("0 0 0 * * SUN", { legacyMode: true }).enumerate(100);
});

Deno.bench("Enumerate 100 sundays (croner mode)", { group: "url" }, () => {
  new Cron("0 0 0 * * SUN", { legacyMode: true }).enumerate(100);
});

Deno.bench("Enumerate 100 29th of february (croner mode)", { group: "url" }, () => {
  new Cron("0 0 0 29 2 *", { legacyMode: true }).enumerate(100);
});
