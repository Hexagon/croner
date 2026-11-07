// Differential test: random patterns, options, time zones and reference dates are evaluated by
// the JavaScript implementation and by the C++ port (driver.cpp), and the results compared.
//
// Usage (from the croner repository root, after `npm install`):
//   g++ -std=c++17 -O2 -Icpp/include cpp/tests/differential/driver.cpp -o /tmp/croner-driver
//   npx tsx cpp/tests/differential/fuzz.ts /tmp/croner-driver [cases] [seed]
//
// Set CRONER_JS to the path of croner.ts (or an npm build) to test against another version.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import * as path from "node:path";

const jsPath = process.env.CRONER_JS ??
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../src/croner.ts");
const { Cron } = await import(pathToFileURL(jsPath).href);

const driver = process.argv[2];
const cases = Number(process.argv[3] ?? 5000);
let seed = Number(process.argv[4] ?? 1);
if (!driver) {
  console.error("usage: fuzz.ts <driver> [cases] [seed]");
  process.exit(2);
}

// Deterministic PRNG (mulberry32)
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length)];
const chance = (p: number) => rand() < p;

function numField(lo: number, hi: number, names?: string[]): string {
  const v = () => (names && chance(0.3) ? names[int(lo, hi) - lo] ?? String(int(lo, hi)) : String(int(lo, hi)));
  const one = (): string => {
    switch (int(0, 6)) {
      case 0: return "*";
      case 1: return `*/${int(1, Math.min(hi, 15))}`;
      case 2: {
        const a = int(lo, hi), b = int(a, hi);
        return `${a}-${b}`;
      }
      case 3: {
        const a = int(lo, hi), b = int(a, hi);
        return `${a}-${b}/${int(1, 7)}`;
      }
      default: return v();
    }
  };
  if (chance(0.2)) return [one(), one(), one()].join(",");
  return one();
}

function dayField(): string {
  const r = rand();
  if (r < 0.35) return "*";
  if (r < 0.4) return "L";
  if (r < 0.45) return "LW";
  if (r < 0.52) return `${int(1, 31)}W`;
  if (r < 0.55) return "?";
  if (r < 0.58) return `L,${int(1, 28)}`;
  return numField(1, 31);
}

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function dowField(alt: boolean): string {
  const r = rand();
  const lo = alt ? 1 : 0, hi = alt ? 7 : 6;
  if (r < 0.4) return "*";
  if (r < 0.5) return `${pick(dayNames)}#${int(1, 5)}`;
  if (r < 0.55) return `${int(lo, hi)}L`;
  if (r < 0.6) return `+${numField(lo, hi)}`;
  if (r < 0.65) return "MON-FRI";
  if (r < 0.68) return "FRI-SUN";
  if (r < 0.7) return "?";
  return numField(lo, alt ? 7 : 7);
}

// Random edits, so that invalid patterns are compared too
function mutate(p: string): string {
  const chars = "0123456789*/,-#LWl?+ abcFRIMONjan";
  const a = p.split("");
  for (let k = int(1, 3); k > 0; k--) {
    const at = int(0, a.length);
    switch (int(0, 2)) {
      case 0: a.splice(at, 0, chars[int(0, chars.length - 1)]); break;
      case 1: a.splice(at, 1); break;
      default: a[at] = chars[int(0, chars.length - 1)];
    }
  }
  return a.join("");
}

function pattern(alt: boolean): string {
  if (chance(0.15)) return mutate(validPattern(alt));
  return validPattern(alt);
}

function validPattern(alt: boolean): string {
  if (chance(0.03)) return pick(["@yearly", "@monthly", "@weekly", "@daily", "@hourly"]);
  const fixed = chance(0.35);
  const sec = fixed ? String(int(0, 59)) : (chance(0.5) ? "0" : numField(0, 59));
  const min = fixed ? String(int(0, 59)) : numField(0, 59);
  const hour = fixed ? String(chance(0.5) ? int(1, 3) : int(0, 23)) : numField(0, 23);
  const month = chance(0.6) ? "*" : numField(1, 12, ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]);
  const parts = [min, hour, dayField(), month, dowField(alt)];
  const n = pick([5, 6, 6, 7]);
  if (n >= 6) parts.unshift(sec);
  if (n === 7) parts.push(chance(0.5) ? "*" : `${int(1995, 2040)}-${int(2040, 2070)}`);
  return parts.join(" ");
}

const zones = [
  "", "Etc/UTC", "Europe/Stockholm", "America/New_York", "Australia/Lord_Howe",
  "Pacific/Chatham", "America/Santiago", "Asia/Kolkata", "Europe/London", "America/Sao_Paulo",
  "Asia/Tehran", "Africa/Casablanca", "America/St_Johns", "Pacific/Apia", "Europe/Dublin",
];

function isoDate(y0: number, y1: number): string {
  const ms = Date.UTC(y0, 0, 1) + Math.floor(rand() * (Date.UTC(y1, 0, 1) - Date.UTC(y0, 0, 1)));
  const d = new Date(ms);
  // Sometimes land exactly on DST-prone hours
  if (chance(0.3)) d.setUTCMinutes(0, 0, 0);
  if (chance(0.3)) d.setUTCMilliseconds(0);
  const iso = d.toISOString();
  return chance(0.5) ? iso : iso.slice(0, 19); // local (zone) time or exact instant
}

type Case = string[];
const list: Case[] = [];
for (let i = 0; i < cases; i++) {
  const alt = chance(0.1);
  const tz = pick(zones);
  const utcOffset = tz === "" && chance(0.2) ? String(int(-12, 14) * 60 + pick([0, 0, 30, 45])) : "";
  const interval = chance(0.1) ? String(int(2, 7200)) : "0";
  const startAt = chance(0.15) ? isoDate(2000, 2040) : "";
  const stopAt = chance(0.15) ? isoDate(2010, 2060) : "";
  const mode = chance(0.1) ? pick(["auto", "5-part", "6-part", "7-part", "5-or-6-parts", "6-or-7-parts"]) : "auto";
  list.push([
    pattern(alt), tz, utcOffset, chance(0.2) ? "1" : "0", alt ? "1" : "0", chance(0.05) ? "1" : "0",
    interval, startAt, stopAt, chance(0.1) ? String(int(-3, 3)) : "0", mode,
    isoDate(1995, 2055), chance(0.7) ? "n" : "p", String(int(1, 8)), chance(0.05) ? String(int(0, 5)) : "",
  ]);
}

function runJs(c: Case): string {
  const [pat, tz, off, dad, alt, sloppy, interval, startAt, stopAt, dayOffset, mode, ref, dir, n, maxRuns] = c;
  try {
    // deno-lint-ignore no-explicit-any
    const o: any = {
      domAndDow: dad === "1", alternativeWeekdays: alt === "1", sloppyRanges: sloppy === "1",
      interval: Number(interval), dayOffset: Number(dayOffset), mode,
    };
    if (tz) o.timezone = tz;
    if (off) o.utcOffset = Number(off);
    if (startAt) o.startAt = startAt;
    if (stopAt) o.stopAt = stopAt;
    if (maxRuns) o.maxRuns = Number(maxRuns);
    const job = new Cron(pat, o);
    const runs: Date[] = dir === "p" ? job.previousRuns(Number(n), ref) : job.nextRuns(Number(n), ref);
    return runs.length ? runs.map((d) => d.toISOString()).join(",") : "-";
  } catch {
    return "ERR";
  }
}

const input = list.map((c) => c.join("\t")).join("\n") + "\n";
const res = spawnSync(driver, [], { input, maxBuffer: 1 << 30, env: { ...process.env } });
if (res.status !== 0) {
  console.error("driver failed", res.stderr?.toString());
  process.exit(2);
}
const cpp = res.stdout.toString().trimEnd().split("\n");
// Known divergence: JavaScript's Date.UTC() reads years 0-99 as 1900-1999, so croner.js finds no
// runs in years 1-99 (allowed in the year field by OCPS). The C++ port handles them.
const earlyYears = (runs: string) =>
  runs !== "-" && runs !== "ERR" && runs.split(",").every((r) => /^00\d\d-/.test(r));
// Known divergence: before 1900 the time zone databases differ (Node.js ships ICU's tzdata with
// historic local mean times, while many systems link zones like Europe/Stockholm to another zone)
const before1900 = (runs: string) =>
  runs !== "-" && runs !== "ERR" && runs.split(",").every((r) => /^(0\d\d\d|1[0-8]\d\d)-/.test(r));
let failures = 0, errors = 0, empty = 0, known = 0;
for (let i = 0; i < list.length; i++) {
  const js = runJs(list[i]);
  if (js === "ERR") errors++;
  if (js === "-") empty++;
  if (
    js !== cpp[i] &&
    ((js === "-" && earlyYears(cpp[i])) || (before1900(js) && before1900(cpp[i])))
  ) {
    known++;
  } else if (js !== cpp[i]) {
    failures++;
    if (failures <= 20) {
      console.log(`MISMATCH #${i}: ${JSON.stringify(list[i])}\n  js : ${js}\n  cpp: ${cpp[i]}`);
    }
  }
}
console.log(
  `${list.length} cases, ${failures} mismatches (${errors} invalid, ${empty} without runs, ` +
    `${known} known divergences in years before 1900)`,
);
process.exit(failures ? 1 : 0);
