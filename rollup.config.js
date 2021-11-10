export default [
	{
		input: "./src/croner.single.js",
		output: {
			file: "dist/croner.cjs",
			format: "umd",
			name: "Cron",
			exports: "default"
		}
	},
	{	
		input: "./src/croner.js",
		output: {
			file: "dist/croner.mjs",
			format: "es"
		}
	}
];