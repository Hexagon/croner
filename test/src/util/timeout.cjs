// Convenience function for asynchronous testing
const timeout = (timeoutMs, fn) => {
	return () => { 
		let to = void 0;
		return new Promise((resolve, reject) => {
			fn(resolve, reject);
			to = setTimeout(() => { reject(new Error("Timeout")); }, timeoutMs);
		}).finally(() => {
			clearTimeout(to);
		});
	};
};

module.exports = timeout;