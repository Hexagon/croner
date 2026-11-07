---
title: "Usage (JavaScript)"
has_children: true
nav_order: 4
---

# Usage (JavaScript)

---

The most basic usage of Croner for scheduling is:

```ts
new Cron("0 12 * * *", () => {
    console.log("This will run every day at 12:00");
});
```

And the most basic usage of Croner for getting next execution time of a pattern is:

```ts
console.log(new Cron("0 12 * * *").nextRun());
// 2023-07-08T12:00:00
```

## More examples

**Run a function at the interval defined by a cron expression**

```ts
const job = new Cron('*/5 * * * * *', () => {
	console.log('This will run every five seconds');
});
```

**Days left to a specific date**

```ts
const msLeft = new Cron('59 59 23 24 DEC *').nextRun() - new Date();
console.log(Math.floor(msLeft/1000/3600/24) + " days left to next christmas eve");
```

**Run a function at a specific date/time using a non-local timezone**

Time is ISO 8601 local time, this will run 2030-01-23 00:00:00 according to the time in Asia/Kolkata

```ts
new Cron('2030-01-23T00:00:00', { timezone: 'Asia/Kolkata' }, () => { console.log('Yay!') });
```

More examples at [Examples](examples.md)
