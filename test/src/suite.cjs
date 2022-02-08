module.exports = function (Cron) {
	const test = require("uvu").test;

	require("./suites/basics.cjs")(Cron, test);
	require("./suites/pattern.cjs")(Cron, test);
	require("./suites/range.cjs")(Cron, test);
	require("./suites/stepping.cjs")(Cron, test);
	require("./suites/options.cjs")(Cron, test);
	require("./suites/timezone.cjs")(Cron, test);

	test.run();
};