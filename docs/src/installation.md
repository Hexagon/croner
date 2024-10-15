---
title: "Installation"
nav_order: 2
---

# Installation

---

Croner can be installed using your preferred package manager or CDN. After installation, it can be included in your project as follows:

> If you are migrating from a different library such as `cron` or `node-cron`, or upgrading from an older version of croner, see the [Migration Guide](migration.md).
{ .note }

{% include multiplex.html %}

### Importing with Node.js or Bun

For Node.js or Bun, you can use ESM Import or CommonJS Require:

```ts
// ESM Import
import { Cron } from "croner";

// or CommonJS Require, destructure to add type hints
const { Cron } = require("croner");
```

### Importing with Deno

For Deno, import Croner from the provided URL:

```ts
// From deno.land/x
import { Cron } from "https://deno.land/x/croner@$CRONER_VERSION/dist/croner.js";

// ... or jsr.io
import { Cron } from "jsr:@hexagon/croner@$CRONER_VERSION";
```

Make sure to replace `$CRONER_VERSION` with the latest version.

### In a Webpage Using the UMD-module

To use Croner in a webpage, you can load it as a UMD module from a CDN:

`<script src="https://cdn.jsdelivr.net/npm/croner@9/dist/croner.umd.js"></script>`
