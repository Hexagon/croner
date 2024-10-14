/**
 * Helper function to check if a variable is a function.
 *
 * @param v The variable to check.
 * @returns True if the variable is a function, false otherwise.
 * @private
 */
function isFunction(v: unknown) {
  return (
    Object.prototype.toString.call(v) === "[object Function]" ||
    "function" === typeof v ||
    v instanceof Function
  );
}

/**
 * Helper function to unref a timer in both Deno and Node.js.
 *
 * @param timer The timer to unref.
 * @private
 */
//@ts-ignore Cross Runtime
function unrefTimer(timer: NodeJS.Timeout | number) {
  //@ts-ignore Cross Runtime
  if (typeof Deno !== "undefined" && typeof Deno.unrefTimer !== "undefined") {
    //@ts-ignore Cross Runtime
    Deno.unrefTimer(timer as number);
    //@ts-ignore Cross Runtime
  } else if (timer && typeof (timer as NodeJS.Timeout).unref !== "undefined") {
    //@ts-ignore Cross Runtime
    (timer as NodeJS.Timeout).unref();
  }
}

export { isFunction, unrefTimer };
