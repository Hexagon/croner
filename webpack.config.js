const 
  path = require('path');

module.exports = [
  {
    mode: 'production',
    entry: "./index.js",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "croner.min.js",
        library: { type: "umd" },
        globalObject: 'this'
    }
  },
  {
    mode: 'production',
    entry: "./index.mjs",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "croner.min.mjs",
        library: { "type": "module" }
    },
    experiments: {
      outputModule: true
    }
  }
];