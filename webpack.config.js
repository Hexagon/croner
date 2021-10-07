const 
	path = require("path");

module.exports = [
	{
		mode: "production",
		entry: "./src/croner.js",
		output: {
			path: path.join(__dirname, "dist"),
			filename: "croner.min.js",
			library: {
				name: "Cron",
				type: "umd"
			},
			globalObject: "this"
		}
	},
	{
		mode: "production",
		entry: "./esm/croner.mjs",
		output: {
			path: path.join(__dirname, "dist"),
			filename: "croner.min.mjs",
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	}
];