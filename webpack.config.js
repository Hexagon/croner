import { resolve } from "path";

const configuration = [
	{
		mode: "production",
		entry: "./src/croner.js",
		output: {
			path: resolve("./dist"),
			filename: "croner.min.js",
			library: {
				name: "Cron",
				type: "umd",
				export: "default"
			},
			globalObject: "this"
		}
	},
	{
		mode: "production",
		entry: "./src/croner.js",
		output: {
			path: resolve("./dist-legacy"),
			filename: "croner.cjs",
			library: {
				name: "Cron",
				type: "umd",
				export: "default"
			},
			globalObject: "this"
		}
	},
	{
		mode: "production",
		entry: "./src/croner.js",
		output: {
			path: resolve("./dist"),
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

export default configuration;