---
layout: page
title: "Installation"
nav_order: 2
---

# Installation

---

{: .note-title }
> NOTE
>
> If you are migrating from a different library such as `cron` or `node-cron`, or upgrading from an older version of croner, see the [Migration Guide](migration.md).

Croner can be installed using your preferred package manager or CDN. After installation, it can be included in your project as follows:

{% include multiplex.html %}

### Importing with Node.js or Bun

For Node.js or Bun, you can use ESM Import or CommonJS Require:

    // ESM Import
    import { Cron } from "croner";

    // or CommonJS Require, destructure to add type hints
    const { Cron } = require("croner");

### Importing with Deno

For Deno, import Croner from the provided URL:

    import { Cron } from "https://deno.land/x/croner@6.0.6/dist/croner.js";

Make sure to replace `6.0.6` with the latest version.

### In a Webpage Using the UMD-module

To use Croner in a webpage, you can load it as a UMD module from a CDN:

    <script src="https://cdn.jsdelivr.net/npm/croner@6/dist/croner.umd.min.js"></script>
