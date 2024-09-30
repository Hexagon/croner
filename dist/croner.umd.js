var base64 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/croner.js
  var croner_exports = {};
  __export(croner_exports, {
    Cron: () => Cron,
    default: () => croner_default,
    scheduledJobs: () => scheduledJobs
  });

  // src/helpers/minitz.js
  function minitz(y, m, d, h, i, s, tz, throwOnInvalid) {
    return minitz.fromTZ(minitz.tp(y, m, d, h, i, s, tz), throwOnInvalid);
  }
  minitz.fromTZISO = (localTimeStr, tz, throwOnInvalid) => {
    return minitz.fromTZ(parseISOLocal(localTimeStr, tz), throwOnInvalid);
  };
  minitz.fromTZ = function(tp, throwOnInvalid) {
    const inDate = new Date(Date.UTC(
      tp.y,
      tp.m - 1,
      tp.d,
      tp.h,
      tp.i,
      tp.s
    )), offset = getTimezoneOffset(tp.tz, inDate), dateGuess = new Date(inDate.getTime() - offset), dateOffsGuess = getTimezoneOffset(tp.tz, dateGuess);
    if (dateOffsGuess - offset === 0) {
      return dateGuess;
    } else {
      const dateGuess2 = new Date(inDate.getTime() - dateOffsGuess), dateOffsGuess2 = getTimezoneOffset(tp.tz, dateGuess2);
      if (dateOffsGuess2 - dateOffsGuess === 0) {
        return dateGuess2;
      } else if (!throwOnInvalid && dateOffsGuess2 - dateOffsGuess > 0) {
        return dateGuess2;
      } else if (!throwOnInvalid) {
        return dateGuess;
      } else {
        throw new Error("Invalid date passed to fromTZ()");
      }
    }
  };
  minitz.toTZ = function(d, tzStr) {
    const localDateString = d.toLocaleString("en-US", { timeZone: tzStr }).replace(/[\u202f]/, " ");
    const td = new Date(localDateString);
    return {
      y: td.getFullYear(),
      m: td.getMonth() + 1,
      d: td.getDate(),
      h: td.getHours(),
      i: td.getMinutes(),
      s: td.getSeconds(),
      tz: tzStr
    };
  };
  minitz.tp = (y, m, d, h, i, s, tz) => {
    return { y, m, d, h, i, s, tz };
  };
  function getTimezoneOffset(timeZone, date = /* @__PURE__ */ new Date()) {
    const tz = date.toLocaleString("en-US", { timeZone, timeZoneName: "shortOffset" }).split(" ").slice(-1)[0];
    const dateString = date.toLocaleString("en-US").replace(/[\u202f]/, " ");
    return Date.parse(`${dateString} GMT`) - Date.parse(`${dateString} ${tz}`);
  }
  function parseISOLocal(dtStr, tz) {
    const pd = new Date(Date.parse(dtStr));
    if (isNaN(pd)) {
      throw new Error("minitz: Invalid ISO8601 passed to parser.");
    }
    const stringEnd = dtStr.substring(9);
    if (dtStr.includes("Z") || stringEnd.includes("-") || stringEnd.includes("+")) {
      return minitz.tp(pd.getUTCFullYear(), pd.getUTCMonth() + 1, pd.getUTCDate(), pd.getUTCHours(), pd.getUTCMinutes(), pd.getUTCSeconds(), "Etc/UTC");
    } else {
      return minitz.tp(pd.getFullYear(), pd.getMonth() + 1, pd.getDate(), pd.getHours(), pd.getMinutes(), pd.getSeconds(), tz);
    }
  }
  minitz.minitz = minitz;

  // src/options.js
  function CronOptions(options) {
    if (options === void 0) {
      options = {};
    }
    delete options.name;
    options.legacyMode = options.legacyMode === void 0 ? true : options.legacyMode;
    options.paused = options.paused === void 0 ? false : options.paused;
    options.maxRuns = options.maxRuns === void 0 ? Infinity : options.maxRuns;
    options.catch = options.catch === void 0 ? false : options.catch;
    options.interval = options.interval === void 0 ? 0 : parseInt(options.interval, 10);
    options.utcOffset = options.utcOffset === void 0 ? void 0 : parseInt(options.utcOffset, 10);
    options.unref = options.unref === void 0 ? false : options.unref;
    if (options.startAt) {
      options.startAt = new CronDate(options.startAt, options.timezone);
    }
    if (options.stopAt) {
      options.stopAt = new CronDate(options.stopAt, options.timezone);
    }
    if (options.interval !== null) {
      if (isNaN(options.interval)) {
        throw new Error("CronOptions: Supplied value for interval is not a number");
      } else if (options.interval < 0) {
        throw new Error("CronOptions: Supplied value for interval can not be negative");
      }
    }
    if (options.utcOffset !== void 0) {
      if (isNaN(options.utcOffset)) {
        throw new Error("CronOptions: Invalid value passed for utcOffset, should be number representing minutes offset from UTC.");
      } else if (options.utcOffset < -870 || options.utcOffset > 870) {
        throw new Error("CronOptions: utcOffset out of bounds.");
      }
      if (options.utcOffset !== void 0 && options.timezone) {
        throw new Error("CronOptions: Combining 'utcOffset' with 'timezone' is not allowed.");
      }
    }
    if (options.unref !== true && options.unref !== false) {
      throw new Error("CronOptions: Unref should be either true, false or undefined(false).");
    }
    return options;
  }

  // src/pattern.js
  var LAST_OCCURRENCE = 32;
  var ANY_OCCURRENCE = 1 | 2 | 4 | 8 | 16 | LAST_OCCURRENCE;
  var OCCURRENCE_BITMASKS = [1, 2, 4, 8, 16];
  function CronPattern(pattern, timezone) {
    this.pattern = pattern;
    this.timezone = timezone;
    this.second = Array(60).fill(0);
    this.minute = Array(60).fill(0);
    this.hour = Array(24).fill(0);
    this.day = Array(31).fill(0);
    this.month = Array(12).fill(0);
    this.dayOfWeek = Array(7).fill(0);
    this.lastDayOfMonth = false;
    this.starDOM = false;
    this.starDOW = false;
    this.parse();
  }
  CronPattern.prototype.parse = function() {
    if (!(typeof this.pattern === "string" || this.pattern.constructor === String)) {
      throw new TypeError("CronPattern: Pattern has to be of type string.");
    }
    if (this.pattern.indexOf("@") >= 0) this.pattern = this.handleNicknames(this.pattern).trim();
    const parts = this.pattern.replace(/\s+/g, " ").split(" ");
    if (parts.length < 5 || parts.length > 6) {
      throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exactly five or six space separated parts are required.");
    }
    if (parts.length === 5) {
      parts.unshift("0");
    }
    if (parts[3].indexOf("L") >= 0) {
      parts[3] = parts[3].replace("L", "");
      this.lastDayOfMonth = true;
    }
    if (parts[3] == "*") {
      this.starDOM = true;
    }
    if (parts[4].length >= 3) parts[4] = this.replaceAlphaMonths(parts[4]);
    if (parts[5].length >= 3) parts[5] = this.replaceAlphaDays(parts[5]);
    if (parts[5] == "*") {
      this.starDOW = true;
    }
    if (this.pattern.indexOf("?") >= 0) {
      const initDate = new CronDate(/* @__PURE__ */ new Date(), this.timezone).getDate(true);
      parts[0] = parts[0].replace("?", initDate.getSeconds());
      parts[1] = parts[1].replace("?", initDate.getMinutes());
      parts[2] = parts[2].replace("?", initDate.getHours());
      if (!this.starDOM) parts[3] = parts[3].replace("?", initDate.getDate());
      parts[4] = parts[4].replace("?", initDate.getMonth() + 1);
      if (!this.starDOW) parts[5] = parts[5].replace("?", initDate.getDay());
    }
    this.throwAtIllegalCharacters(parts);
    this.partToArray("second", parts[0], 0, 1);
    this.partToArray("minute", parts[1], 0, 1);
    this.partToArray("hour", parts[2], 0, 1);
    this.partToArray("day", parts[3], -1, 1);
    this.partToArray("month", parts[4], -1, 1);
    this.partToArray("dayOfWeek", parts[5], 0, ANY_OCCURRENCE);
    if (this.dayOfWeek[7]) {
      this.dayOfWeek[0] = this.dayOfWeek[7];
    }
  };
  CronPattern.prototype.partToArray = function(type, conf, valueIndexOffset, defaultValue) {
    const arr = this[type];
    const lastDayOfMonth = type === "day" && this.lastDayOfMonth;
    if (conf === "" && !lastDayOfMonth) throw new TypeError("CronPattern: configuration entry " + type + " (" + conf + ") is empty, check for trailing spaces.");
    if (conf === "*") return arr.fill(defaultValue);
    const split = conf.split(",");
    if (split.length > 1) {
      for (let i = 0; i < split.length; i++) {
        this.partToArray(type, split[i], valueIndexOffset, defaultValue);
      }
    } else if (conf.indexOf("-") !== -1 && conf.indexOf("/") !== -1) {
      this.handleRangeWithStepping(conf, type, valueIndexOffset, defaultValue);
    } else if (conf.indexOf("-") !== -1) {
      this.handleRange(conf, type, valueIndexOffset, defaultValue);
    } else if (conf.indexOf("/") !== -1) {
      this.handleStepping(conf, type, valueIndexOffset, defaultValue);
    } else if (conf !== "") {
      this.handleNumber(conf, type, valueIndexOffset, defaultValue);
    }
  };
  CronPattern.prototype.throwAtIllegalCharacters = function(parts) {
    for (let i = 0; i < parts.length; i++) {
      const reValidCron = i === 5 ? /[^/*0-9,\-#L]+/ : /[^/*0-9,-]+/;
      if (reValidCron.test(parts[i])) {
        throw new TypeError("CronPattern: configuration entry " + i + " (" + parts[i] + ") contains illegal characters.");
      }
    }
  };
  CronPattern.prototype.handleNumber = function(conf, type, valueIndexOffset, defaultValue) {
    const result = this.extractNth(conf, type);
    const i = parseInt(result[0], 10) + valueIndexOffset;
    if (isNaN(i)) {
      throw new TypeError("CronPattern: " + type + " is not a number: '" + conf + "'");
    }
    this.setPart(type, i, result[1] || defaultValue);
  };
  CronPattern.prototype.setPart = function(part, index, value) {
    if (!Object.prototype.hasOwnProperty.call(this, part)) {
      throw new TypeError("CronPattern: Invalid part specified: " + part);
    }
    if (part === "dayOfWeek") {
      if (index === 7) index = 0;
      if ((index < 0 || index > 6) && index !== "L") {
        throw new RangeError("CronPattern: Invalid value for dayOfWeek: " + index);
      }
      this.setNthWeekdayOfMonth(index, value);
      return;
    }
    if (part === "second" || part === "minute") {
      if (index < 0 || index >= 60) {
        throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
      }
    } else if (part === "hour") {
      if (index < 0 || index >= 24) {
        throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
      }
    } else if (part === "day") {
      if (index < 0 || index >= 31) {
        throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
      }
    } else if (part === "month") {
      if (index < 0 || index >= 12) {
        throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
      }
    }
    this[part][index] = value;
  };
  CronPattern.prototype.handleRangeWithStepping = function(conf, type, valueIndexOffset, defaultValue) {
    const result = this.extractNth(conf, type);
    const matches = result[0].match(/^(\d+)-(\d+)\/(\d+)$/);
    if (matches === null) throw new TypeError("CronPattern: Syntax error, illegal range with stepping: '" + conf + "'");
    let [, lower, upper, steps] = matches;
    lower = parseInt(lower, 10) + valueIndexOffset;
    upper = parseInt(upper, 10) + valueIndexOffset;
    steps = parseInt(steps, 10);
    if (isNaN(lower)) throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
    if (isNaN(upper)) throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
    if (isNaN(steps)) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
    if (steps === 0) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
    if (steps > this[type].length) throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part (" + this[type].length + ")");
    if (lower > upper) throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");
    for (let i = lower; i <= upper; i += steps) {
      this.setPart(type, i, result[1] || defaultValue);
    }
  };
  CronPattern.prototype.extractNth = function(conf, type) {
    let rest = conf;
    let nth;
    if (rest.includes("#")) {
      if (type !== "dayOfWeek") {
        throw new Error("CronPattern: nth (#) only allowed in day-of-week field");
      }
      nth = rest.split("#")[1];
      rest = rest.split("#")[0];
    }
    return [rest, nth];
  };
  CronPattern.prototype.handleRange = function(conf, type, valueIndexOffset, defaultValue) {
    const result = this.extractNth(conf, type);
    const split = result[0].split("-");
    if (split.length !== 2) {
      throw new TypeError("CronPattern: Syntax error, illegal range: '" + conf + "'");
    }
    const lower = parseInt(split[0], 10) + valueIndexOffset, upper = parseInt(split[1], 10) + valueIndexOffset;
    if (isNaN(lower)) {
      throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
    } else if (isNaN(upper)) {
      throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
    }
    if (lower > upper) {
      throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");
    }
    for (let i = lower; i <= upper; i++) {
      this.setPart(type, i, result[1] || defaultValue);
    }
  };
  CronPattern.prototype.handleStepping = function(conf, type, valueIndexOffset, defaultValue) {
    const result = this.extractNth(conf, type);
    const split = result[0].split("/");
    if (split.length !== 2) {
      throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + conf + "'");
    }
    let start = 0;
    if (split[0] !== "*") {
      start = parseInt(split[0], 10) + valueIndexOffset;
    }
    const steps = parseInt(split[1], 10);
    if (isNaN(steps)) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
    if (steps === 0) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
    if (steps > this[type].length) throw new TypeError("CronPattern: Syntax error, max steps for part is (" + this[type].length + ")");
    for (let i = start; i < this[type].length; i += steps) {
      this.setPart(type, i, result[1] || defaultValue);
    }
  };
  CronPattern.prototype.replaceAlphaDays = function(conf) {
    return conf.replace(/-sun/gi, "-7").replace(/sun/gi, "0").replace(/mon/gi, "1").replace(/tue/gi, "2").replace(/wed/gi, "3").replace(/thu/gi, "4").replace(/fri/gi, "5").replace(/sat/gi, "6");
  };
  CronPattern.prototype.replaceAlphaMonths = function(conf) {
    return conf.replace(/jan/gi, "1").replace(/feb/gi, "2").replace(/mar/gi, "3").replace(/apr/gi, "4").replace(/may/gi, "5").replace(/jun/gi, "6").replace(/jul/gi, "7").replace(/aug/gi, "8").replace(/sep/gi, "9").replace(/oct/gi, "10").replace(/nov/gi, "11").replace(/dec/gi, "12");
  };
  CronPattern.prototype.handleNicknames = function(pattern) {
    const cleanPattern = pattern.trim().toLowerCase();
    if (cleanPattern === "@yearly" || cleanPattern === "@annually") {
      return "0 0 1 1 *";
    } else if (cleanPattern === "@monthly") {
      return "0 0 1 * *";
    } else if (cleanPattern === "@weekly") {
      return "0 0 * * 0";
    } else if (cleanPattern === "@daily") {
      return "0 0 * * *";
    } else if (cleanPattern === "@hourly") {
      return "0 * * * *";
    } else {
      return pattern;
    }
  };
  CronPattern.prototype.setNthWeekdayOfMonth = function(index, nthWeekday) {
    if (nthWeekday === "L") {
      this["dayOfWeek"][index] = this["dayOfWeek"][index] | LAST_OCCURRENCE;
    } else if (nthWeekday < 6 && nthWeekday > 0) {
      this["dayOfWeek"][index] = this["dayOfWeek"][index] | OCCURRENCE_BITMASKS[nthWeekday - 1];
    } else if (nthWeekday === ANY_OCCURRENCE) {
      this["dayOfWeek"][index] = ANY_OCCURRENCE;
    } else {
      throw new TypeError(`CronPattern: nth weekday of of range, should be 1-5 or L. Value: ${nthWeekday}`);
    }
  };

  // src/date.js
  var DaysOfMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var RecursionSteps = [
    ["month", "year", 0],
    ["day", "month", -1],
    ["hour", "day", 0],
    ["minute", "hour", 0],
    ["second", "minute", 0]
  ];
  function CronDate(d, tz) {
    this.tz = tz;
    if (d && d instanceof Date) {
      if (!isNaN(d)) {
        this.fromDate(d);
      } else {
        throw new TypeError("CronDate: Invalid date passed to CronDate constructor");
      }
    } else if (d === void 0) {
      this.fromDate(/* @__PURE__ */ new Date());
    } else if (d && typeof d === "string") {
      this.fromString(d);
    } else if (d instanceof CronDate) {
      this.fromCronDate(d);
    } else {
      throw new TypeError("CronDate: Invalid type (" + typeof d + ") passed to CronDate constructor");
    }
  }
  CronDate.prototype.isNthWeekdayOfMonth = function(year, month, day, nth) {
    const date = new Date(Date.UTC(year, month, day));
    const weekday = date.getUTCDay();
    let count = 0;
    for (let d = 1; d <= day; d++) {
      if (new Date(Date.UTC(year, month, d)).getUTCDay() === weekday) {
        count++;
      }
    }
    if (nth & ANY_OCCURRENCE && OCCURRENCE_BITMASKS[count - 1] & nth) {
      return true;
    }
    if (nth & LAST_OCCURRENCE) {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let d = day + 1; d <= daysInMonth; d++) {
        if (new Date(Date.UTC(year, month, d)).getUTCDay() === weekday) {
          return false;
        }
      }
      return true;
    }
    return false;
  };
  CronDate.prototype.fromDate = function(inDate) {
    if (this.tz !== void 0) {
      if (typeof this.tz === "number") {
        this.ms = inDate.getUTCMilliseconds();
        this.second = inDate.getUTCSeconds();
        this.minute = inDate.getUTCMinutes() + this.tz;
        this.hour = inDate.getUTCHours();
        this.day = inDate.getUTCDate();
        this.month = inDate.getUTCMonth();
        this.year = inDate.getUTCFullYear();
        this.apply();
      } else {
        const d = minitz.toTZ(inDate, this.tz);
        this.ms = inDate.getMilliseconds();
        this.second = d.s;
        this.minute = d.i;
        this.hour = d.h;
        this.day = d.d;
        this.month = d.m - 1;
        this.year = d.y;
      }
    } else {
      this.ms = inDate.getMilliseconds();
      this.second = inDate.getSeconds();
      this.minute = inDate.getMinutes();
      this.hour = inDate.getHours();
      this.day = inDate.getDate();
      this.month = inDate.getMonth();
      this.year = inDate.getFullYear();
    }
  };
  CronDate.prototype.fromCronDate = function(d) {
    this.tz = d.tz;
    this.year = d.year;
    this.month = d.month;
    this.day = d.day;
    this.hour = d.hour;
    this.minute = d.minute;
    this.second = d.second;
    this.ms = d.ms;
  };
  CronDate.prototype.apply = function() {
    if (this.month > 11 || this.day > DaysOfMonth[this.month] || this.hour > 59 || this.minute > 59 || this.second > 59 || this.hour < 0 || this.minute < 0 || this.second < 0) {
      const d = new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms));
      this.ms = d.getUTCMilliseconds();
      this.second = d.getUTCSeconds();
      this.minute = d.getUTCMinutes();
      this.hour = d.getUTCHours();
      this.day = d.getUTCDate();
      this.month = d.getUTCMonth();
      this.year = d.getUTCFullYear();
      return true;
    } else {
      return false;
    }
  };
  CronDate.prototype.fromString = function(str) {
    if (typeof this.tz === "number") {
      const inDate = minitz.fromTZISO(str);
      this.ms = inDate.getUTCMilliseconds();
      this.second = inDate.getUTCSeconds();
      this.minute = inDate.getUTCMinutes();
      this.hour = inDate.getUTCHours();
      this.day = inDate.getUTCDate();
      this.month = inDate.getUTCMonth();
      this.year = inDate.getUTCFullYear();
      this.apply();
    } else {
      return this.fromDate(minitz.fromTZISO(str, this.tz));
    }
  };
  CronDate.prototype.findNext = function(options, target, pattern, offset) {
    const originalTarget = this[target];
    let lastDayOfMonth;
    if (pattern.lastDayOfMonth) {
      if (this.month !== 1) {
        lastDayOfMonth = DaysOfMonth[this.month];
      } else {
        lastDayOfMonth = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate();
      }
    }
    const fDomWeekDay = !pattern.starDOW && target == "day" ? new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay() : void 0;
    for (let i = this[target] + offset; i < pattern[target].length; i++) {
      let match = pattern[target][i];
      if (target === "day" && pattern.lastDayOfMonth && i - offset == lastDayOfMonth) {
        match = true;
      }
      if (target === "day" && !pattern.starDOW) {
        let dowMatch = pattern.dayOfWeek[(fDomWeekDay + (i - offset - 1)) % 7];
        if (dowMatch && dowMatch & ANY_OCCURRENCE) {
          dowMatch = this.isNthWeekdayOfMonth(this.year, this.month, i - offset, dowMatch);
        } else if (dowMatch) {
          throw new Error(`CronDate: Invalid value for dayOfWeek encountered. ${dowMatch}`);
        }
        if (options.legacyMode && !pattern.starDOM) {
          match = match || dowMatch;
        } else {
          match = match && dowMatch;
        }
      }
      if (match) {
        this[target] = i - offset;
        return originalTarget !== this[target] ? 2 : 1;
      }
    }
    return 3;
  };
  CronDate.prototype.recurse = function(pattern, options, doing) {
    const res = this.findNext(options, RecursionSteps[doing][0], pattern, RecursionSteps[doing][2]);
    if (res > 1) {
      let resetLevel = doing + 1;
      while (resetLevel < RecursionSteps.length) {
        this[RecursionSteps[resetLevel][0]] = -RecursionSteps[resetLevel][2];
        resetLevel++;
      }
      if (res === 3) {
        this[RecursionSteps[doing][1]]++;
        this[RecursionSteps[doing][0]] = -RecursionSteps[doing][2];
        this.apply();
        return this.recurse(pattern, options, 0);
      } else if (this.apply()) {
        return this.recurse(pattern, options, doing - 1);
      }
    }
    doing += 1;
    if (doing >= RecursionSteps.length) {
      return this;
    } else if (this.year >= 3e3) {
      return null;
    } else {
      return this.recurse(pattern, options, doing);
    }
  };
  CronDate.prototype.increment = function(pattern, options, hasPreviousRun) {
    this.second += options.interval > 1 && hasPreviousRun ? options.interval : 1;
    this.ms = 0;
    this.apply();
    return this.recurse(pattern, options, 0);
  };
  CronDate.prototype.getDate = function(internal) {
    if (internal || this.tz === void 0) {
      return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms);
    } else {
      if (typeof this.tz === "number") {
        return new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute - this.tz, this.second, this.ms));
      } else {
        return minitz(this.year, this.month + 1, this.day, this.hour, this.minute, this.second, this.tz);
      }
    }
  };
  CronDate.prototype.getTime = function() {
    return this.getDate().getTime();
  };

  // src/utils.js
  function isFunction(v) {
    return Object.prototype.toString.call(v) === "[object Function]" || "function" === typeof v || v instanceof Function;
  }
  function unrefTimer(timer) {
    if (typeof Deno !== "undefined" && typeof Deno.unrefTimer !== "undefined") {
      Deno.unrefTimer(timer);
    } else if (timer && typeof timer.unref !== "undefined") {
      timer.unref();
    }
  }

  // src/croner.js
  var maxDelay = 30 * 1e3;
  var scheduledJobs = [];
  function Cron(pattern, fnOrOptions1, fnOrOptions2) {
    if (!(this instanceof Cron)) {
      return new Cron(pattern, fnOrOptions1, fnOrOptions2);
    }
    let options, func;
    if (isFunction(fnOrOptions1)) {
      func = fnOrOptions1;
    } else if (typeof fnOrOptions1 === "object") {
      options = fnOrOptions1;
    } else if (fnOrOptions1 !== void 0) {
      throw new Error(
        "Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options)."
      );
    }
    if (isFunction(fnOrOptions2)) {
      func = fnOrOptions2;
    } else if (typeof fnOrOptions2 === "object") {
      options = fnOrOptions2;
    } else if (fnOrOptions2 !== void 0) {
      throw new Error(
        "Cron: Invalid argument passed for funcIn. Should be one of function, or object (options)."
      );
    }
    this.name = options ? options.name : void 0;
    this.options = CronOptions(options);
    this._states = {
      /** @type {boolean} */
      kill: false,
      /** @type {boolean} */
      blocking: false,
      /**
       * Start time of previous trigger, updated after each trigger
       * 
       * Stored to use as the actual previous run, even while a new trigger
       * is started. Used by the public funtion `.previousRun()`
       * 
       * @type {CronDate}
       */
      previousRun: void 0,
      /**
       * Start time of current trigger, this is updated just before triggering
       * 
       * This is used internally as "previous run", as we mostly want to know
       * when the previous run _started_
       * 
       * @type {CronDate}
       */
      currentRun: void 0,
      /** @type {CronDate|undefined} */
      once: void 0,
      /** @type {unknown|undefined} */
      currentTimeout: void 0,
      /** @type {number} */
      maxRuns: options ? options.maxRuns : void 0,
      /** @type {boolean} */
      paused: options ? options.paused : false,
      /**
       * @public
       * @type {CronPattern|undefined} */
      pattern: void 0
    };
    if (pattern && (pattern instanceof Date || typeof pattern === "string" && pattern.indexOf(":") > 0)) {
      this._states.once = new CronDate(pattern, this.options.timezone || this.options.utcOffset);
    } else {
      this._states.pattern = new CronPattern(pattern, this.options.timezone);
    }
    if (this.name) {
      const existing = scheduledJobs.find((j) => j.name === this.name);
      if (existing) {
        throw new Error(
          "Cron: Tried to initialize new named job '" + this.name + "', but name already taken."
        );
      } else {
        scheduledJobs.push(this);
      }
    }
    if (func !== void 0) {
      this.fn = func;
      this.schedule();
    }
    return this;
  }
  Cron.prototype.nextRun = function(prev) {
    const next = this._next(prev);
    return next ? next.getDate() : null;
  };
  Cron.prototype.nextRuns = function(n, previous) {
    if (n > this._states.maxRuns) {
      n = this._states.maxRuns;
    }
    const enumeration = [];
    let prev = previous || this._states.currentRun;
    while (n-- && (prev = this.nextRun(prev))) {
      enumeration.push(prev);
    }
    return enumeration;
  };
  Cron.prototype.getPattern = function() {
    return this._states.pattern ? this._states.pattern.pattern : void 0;
  };
  Cron.prototype.isRunning = function() {
    const nextRunTime = this.nextRun(this._states.currentRun);
    const isRunning = !this._states.paused;
    const isScheduled = this.fn !== void 0;
    const notIsKilled = !this._states.kill;
    return isRunning && isScheduled && notIsKilled && nextRunTime !== null;
  };
  Cron.prototype.isStopped = function() {
    return this._states.kill;
  };
  Cron.prototype.isBusy = function() {
    return this._states.blocking;
  };
  Cron.prototype.currentRun = function() {
    return this._states.currentRun ? this._states.currentRun.getDate() : null;
  };
  Cron.prototype.previousRun = function() {
    return this._states.previousRun ? this._states.previousRun.getDate() : null;
  };
  Cron.prototype.msToNext = function(prev) {
    prev = prev || /* @__PURE__ */ new Date();
    const next = this._next(prev);
    if (next) {
      return next.getTime() - prev.getTime();
    } else {
      return null;
    }
  };
  Cron.prototype.stop = function() {
    this._states.kill = true;
    if (this._states.currentTimeout) {
      clearTimeout(this._states.currentTimeout);
    }
    const jobIndex = scheduledJobs.indexOf(this);
    if (jobIndex >= 0) {
      scheduledJobs.splice(jobIndex, 1);
    }
  };
  Cron.prototype.pause = function() {
    this._states.paused = true;
    return !this._states.kill;
  };
  Cron.prototype.resume = function() {
    this._states.paused = false;
    return !this._states.kill;
  };
  Cron.prototype.schedule = function(func) {
    if (func && this.fn) {
      throw new Error(
        "Cron: It is not allowed to schedule two functions using the same Croner instance."
      );
    } else if (func) {
      this.fn = func;
    }
    let waitMs = this.msToNext();
    const target = this.nextRun(this._states.currentRun);
    if (waitMs === null || waitMs === void 0 || isNaN(waitMs) || target === null) return this;
    if (waitMs > maxDelay) {
      waitMs = maxDelay;
    }
    this._states.currentTimeout = setTimeout(() => this._checkTrigger(target), waitMs);
    if (this._states.currentTimeout && this.options.unref) {
      unrefTimer(this._states.currentTimeout);
    }
    return this;
  };
  Cron.prototype._trigger = async function(initiationDate) {
    this._states.blocking = true;
    this._states.currentRun = new CronDate(
      void 0,
      // We should use initiationDate, but that does not play well with fake timers in third party tests. In real world there is not much difference though */
      this.options.timezone || this.options.utcOffset
    );
    if (this.options.catch) {
      try {
        await this.fn(this, this.options.context);
      } catch (_e) {
        if (isFunction(this.options.catch)) {
          this.options.catch(_e, this);
        }
      }
    } else {
      await this.fn(this, this.options.context);
    }
    this._states.previousRun = new CronDate(
      initiationDate,
      this.options.timezone || this.options.utcOffset
    );
    this._states.blocking = false;
  };
  Cron.prototype.trigger = async function() {
    await this._trigger();
  };
  Cron.prototype._checkTrigger = function(target) {
    const now = /* @__PURE__ */ new Date(), shouldRun = !this._states.paused && now.getTime() >= target, isBlocked = this._states.blocking && this.options.protect;
    if (shouldRun && !isBlocked) {
      this._states.maxRuns--;
      this._trigger();
    } else {
      if (shouldRun && isBlocked && isFunction(this.options.protect)) {
        setTimeout(() => this.options.protect(this), 0);
      }
    }
    this.schedule();
  };
  Cron.prototype._next = function(prev) {
    let hasPreviousRun = prev || this._states.currentRun ? true : false;
    let startAtInFutureWithInterval = false;
    if (!prev && this.options.startAt && this.options.interval) {
      [prev, hasPreviousRun] = this._calculatePreviousRun(prev, hasPreviousRun);
      startAtInFutureWithInterval = !prev ? true : false;
    }
    prev = new CronDate(prev, this.options.timezone || this.options.utcOffset);
    if (this.options.startAt && prev && prev.getTime() < this.options.startAt.getTime()) {
      prev = this.options.startAt;
    }
    let nextRun = this._states.once || new CronDate(prev, this.options.timezone || this.options.utcOffset);
    if (!startAtInFutureWithInterval && nextRun !== this._states.once) {
      nextRun = nextRun.increment(
        this._states.pattern,
        this.options,
        hasPreviousRun
        // hasPreviousRun is used to allow 
      );
    }
    if (this._states.once && this._states.once.getTime() <= prev.getTime()) {
      return null;
    } else if (nextRun === null || this._states.maxRuns <= 0 || this._states.kill || this.options.stopAt && nextRun.getTime() >= this.options.stopAt.getTime()) {
      return null;
    } else {
      return nextRun;
    }
  };
  Cron.prototype._calculatePreviousRun = function(prev, hasPreviousRun) {
    const now = new CronDate(void 0, this.options.timezone || this.options.utcOffset);
    if (this.options.startAt.getTime() <= now.getTime()) {
      prev = this.options.startAt;
      let prevTimePlusInterval = prev.getTime() + this.options.interval * 1e3;
      while (prevTimePlusInterval <= now.getTime()) {
        prev = new CronDate(prev, this.options.timezone || this.options.utcOffset).increment(this._states.pattern, this.options, true);
        prevTimePlusInterval = prev.getTime() + this.options.interval * 1e3;
      }
      hasPreviousRun = true;
    }
    return [prev, hasPreviousRun];
  };
  Cron.Cron = Cron;
  Cron.scheduledJobs = scheduledJobs;
  var croner_default = Cron;
  return __toCommonJS(croner_exports);
})();
