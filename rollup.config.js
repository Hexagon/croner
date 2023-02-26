export default [
	{
		input: "./src/croner.single.js",
		output: {
			file: "dist/croner.umd.js",
			format: "umd",
			name: "Cron",
			exports: "default"
		}
	},
	{
		input: "./src/croner.single.js",
		output: {
			file: "dist/croner.cjs",
			format: "commonjs",
			name: "Cron",
			exports: "default"
			
		}
	},
	{	
		input: "./src/croner.js",
		output: {
			file: "dist/croner.js",
			format: "es"
		}
	}
];