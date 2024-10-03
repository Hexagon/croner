// Convenience function for asynchronous testing
export function timeout(timeoutMs: number, fn: Function) {
  return () => {
    //@ts-ignore Cross Runtime
    let to: number | NodeJS.Timeout | undefined;
    return new Promise((resolve, reject) => {
      fn(resolve, reject);
      to = setTimeout(() => {
        reject(new Error("Timeout"));
      }, timeoutMs);
    }).finally(() => {
      clearTimeout(to);
    });
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
