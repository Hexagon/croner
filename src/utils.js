/**
 * Helper function to check if a variable is a function
 * @private
 *
 * @param {?} [v] - Variable to check
 * @returns {boolean}
 */
function isFunction(v) {
	return (
		Object.prototype.toString.call(v) === "[object Function]" ||
		"function" === typeof v ||
		v instanceof Function
	);
}

/**
 * Helper function to unref a timer in both Deno and Node
 * @private
 * @param {unknown} [timer] - Timer to unref
 */
function unrefTimer(timer) {
	/* global Deno */
	if (typeof Deno !== "undefined" && typeof Deno.unrefTimer !== "undefined") {
		Deno.unrefTimer(timer);
		// Node
	} else if (timer && typeof timer.unref !== "undefined") {
		timer.unref();
	}
}

export { isFunction, unrefTimer };