const nodelive = require("nodelive");

class LifecycleIterator {

	static create(...args) {
		return new this(...args);
	}

	static NOOP() {}

	constructor(options = {}) {
		Object.assign(this, {
			scope: {},
			life: [],
			onSuccess: this.constructor.NOOP,
			onError: this.constructor.NOOP,
			onFinish: this.constructor.NOOP,
			$output: undefined,
			$index: 0,
			$trace: [],
			$exit: false,
		}, options);
	}

	relive(cycles, parameters = undefined, changes = {}) {
		this.$exit = false;
		[].concat(cycles).forEach(cycle => {
			this.life.push(cycle);
		});
		Object.assign(this, changes);
		return this.next(parameters);
	}

	destroy(timeout = 10) {
		return setTimeout(() => {
			delete this
		}, timeout);
	}

	output(output) {
		this.$output = output;
		return this;
	}

	exit(output = undefined) {
		this.$exit = true;
		if (typeof output !== "undefined") {
			this.$output = output;
		}
		return this;
	}

	promise(...args) {
		return new Promise((onSuccess, onError) => {
			this.onSuccess = onSuccess;
			this.onError = onError;
			this.next(...args);
		});
	}

	next(param) {
		if (this.$exit === true) {
			const data = {
				output: typeof param !== "undefined" ? param : this.$output,
				iterator: this
			};
			setImmediate(this.onSuccess, data);
			setImmediate(this.onFinish, data);
			return this;
		}
		if (this.$index < this.life.length) {
			const method = this.life[this.$index++];
			this.$trace.push(method);
			let output;
			try {
				output = this.scope[method](param, this);
			} catch(error) {
				console.log("catch in sync");
				setTimeout(this.onError, 0, error);
				setTimeout(this.onFinish, 0, undefined, error);
				console.log("called onerror and onfinish");
				return this;
			}
			if (output instanceof Promise) {
				output.then(data => {
					setImmediate(this.next.bind(this), data);
				}).catch(error => {
					console.log("catch in AAAAsync");
					setImmediate(this.onError, error);
					setImmediate(this.onFinish, undefined, error);
				});
				return this;
			} else {
				setImmediate(this.next.bind(this), output);
				return this;
			}
		} else {
			const output = typeof(this.$output) === "undefined" ? param : this.$output;
			const data = {
				output: typeof param !== "undefined" ? param : this.$output,
				iterator: this
			};
			setImmediate(this.onSuccess, data);
			setImmediate(this.onFinish, data);
			return this;
		}
	}

}

module.exports = LifecycleIterator;