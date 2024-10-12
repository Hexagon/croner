---
title: "Usage"
has_children: true
nav_order: 3
---

# Usage

---

The most basic usage of Croner for scheduling is:

```ts
new Cron("0 12 * * *, () => {
    console.log("This will run every day at 12:00");
});
```

And the most basic usage of Croner for getting next execution time of a pattern is:

```ts
console.log(new Cron("0 12 * * *).next());
// 2023-07-08T12:00:00
```