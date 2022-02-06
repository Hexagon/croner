let 
	test = require("uvu").test,

	basics = require("./suites/basics.cjs"),
	pattern = require("./suites/pattern.cjs"),
	range = require("./suites/range.cjs"),
	stepping = require("./suites/stepping.cjs"),
	options = require("./suites/options.cjs"),
	timezone = require("./suites/timezone.cjs");

// Actual tests
module.exports = function (Cron) {

	basics(Cron, test);

	pattern(Cron, test);

	range(Cron, test);

	stepping(Cron, test);

	options(Cron, test);

	timezone(Cron, test);

	test.run();
};