class Life {

	static create(...args) {
		return new this(...args);
	}

	static NOOP() {}

	static get IS_ERRONEOUS() {
		return 0;
	}

	static get IS_ALIVE() {
		return 1;
	}

	static get IS_DONE() {
		return 2;
	}

	static get DEFAULT_OPTIONS() {
		return {
			$cycle: [],
			$scope: undefined,
			$output: undefined,
			$success: this.NOOP,
			$failure: this.NOOP,
			$complete: this.NOOP,
			/////////////////////
			$error: undefined,
			$exit: false,
			$trace: [],
			$index: 0,
			$$success: this.NOOP,
			$$failure: this.NOOP,
			$$status: this.IS_ALIVE,
		}
	}

	constructor(options = {}) {
		Object.assign(this, this.constructor.DEFAULT_OPTIONS, options);
	}

	$$handleSuccess(data) {
		this.$output = data;
		this.$$status = this.constructor.IS_DONE;
		this.$$success(this.$output);
	}

	$$handleError(error) {
		this.$error = error;
		this.$$status = this.constructor.IS_ERRONEOUS;
		this.$$failure(this.$error);
	}

	$$traceFunction(item, modifier = "") {
		if(typeof item === "string") {
			this.$trace.push(item);
		} else if(typeof item === "function") {
			this.$trace.push("{" + modifier + "Function" + (item.name ? "#" + item.name : "") + "}");
		} else if(item instanceof Promise) {
			this.$trace.push("{" + modifier + "Promise}");
		} else {
			this.$trace.push("{" + typeof (item) + "}");
		}
	}

	$$next(...args) {
		if(this.$exit === true) {
			if(this.$$status === this.constructor.IS_ERRONEOUS) {
				this.$$handleError(this.$error);
			} else {
				this.$$handleSuccess((args.length && typeof args[0] !== "undefined") ? args[0] : this.$output);
			}
			return;
		}
		if(this.$index >= this.$cycle.length) {
			switch(this.$$status) {
				case this.constructor.IS_ERRONEOUS:
					this.$$handleError(this.$error);
					break;
				case this.constructor.IS_ALIVE:
					this.$$handleSuccess((args.length && typeof args[0] !== "undefined") ? args[0] : this.$output);
					break;
				case this.constructor.IS_DONE:
					this.$$handleSuccess((args.length && typeof args[0] !== "undefined") ? args[0] : this.$output);
					break;
			}
			return;
		} else {
			const method = this.$cycle[this.$index++];
			let output = undefined;
			if(typeof method === "string") {
				const cycleName = method.replace(/^~+/g, "");
				if(!(cycleName in this.$scope)) {
					this.$$handleError(new Error("CycleNotFoundError"));
					return;
				}
				if(method.startsWith("~~")) {
					let subindex = 0;
					const raceMethods = [];
					let isStopped = false;
					this.$index--;
					while(!isStopped) {
						const subcycle = this.$cycle[this.$index + (subindex++)];
						if(typeof subcycle !== "string") {
							isStopped = true;
						} else {
							if(!subcycle.startsWith("~~")) {
								isStopped = true;
							} else {
								const subcycleName = subcycle.replace(/^~~/g, "");
								if(!(subcycleName in this.$scope)) {
									this.$$handleError.call(this, new Error("CycleNotFoundError"));
									return;
								}
								this.$$traceFunction(subcycle);
								const methodResult = this.$scope[subcycleName](...args, this);
								if(methodResult instanceof Promise) {
									raceMethods.push(methodResult);
								} else {
									raceMethods.push(methodResult);
								}
							}
						}
					}
					this.$index = this.$index + subindex - 1;
					Promise.race(raceMethods).then(this.$$next.bind(this)).catch(this.$$handleError.bind(this));
					return;
				} else if(method.startsWith("~")) {
					let subindex = 0;
					const parallelMethods = [];
					let isStopped = false;
					this.$index--;
					while(!isStopped) {
						const subcycle = this.$cycle[this.$index + (subindex++)];
						if(typeof subcycle !== "string") {
							isStopped = true;
						} else {
							if(subcycle.startsWith("~~") || (!subcycle.startsWith("~"))) {
								isStopped = true;
							} else {
								const subcycleName = subcycle.replace(/^~/g, "");
								if(!(subcycleName in this.$scope)) {
									this.$$handleError.call(this, new Error("CycleNotFoundError"));
									return;
								}
								this.$$traceFunction(subcycle);
								const methodResult = this.$scope[subcycleName](...args, this);
								if(methodResult instanceof Promise) {
									parallelMethods.push(methodResult);
								} else {
									parallelMethods.push(methodResult);
								}
							}
						}
					}
					this.$index = this.$index + subindex - 1;
					Promise.all(parallelMethods).then(this.$$next.bind(this)).catch(this.$$handleError.bind(this));
					return;
				} else {
					this.$$traceFunction(method);
					try {
						output = this.$scope[method](...args, this);
					} catch(error) {
						return this.$$handleError(error);
					}
				}
			} else if(typeof method === "function") {
				this.$$traceFunction(method);
				try {
					output = method(...args, this);
				} catch(error) {
					return this.$$handleError(error);
				}
			} else if(method instanceof Promise) {
				this.$$traceFunction(method);
				output = method;
			} else {
				this.$$traceFunction(method);
				output = method;
			}
			if(output instanceof Promise) {
				output.then(this.$$next.bind(this)).catch(this.$$handleError.bind(this));
			} else {
				setImmediate(this.$$next.bind(this), output);
			}
		}
	}

	start(arg) {
		this.$promise = new Promise((ok, fail) => {
			this.$$success = ok;
			this.$$failure = fail;
			this.$$next(arg);
		})
		.then(arg => {
			const result = this.$success(arg);
			if(typeof result !== "undefined") {
				return result;
			}
			return arg;
		})
		.catch(arg => {
			this.$failure(arg);
			throw arg;
		})
		.finally(arg => {
			const result = this.$complete(arg);
			if(typeof result !== "undefined") {
				return result;
			}
			return arg;
		});
		return this.$promise;
	}

	setOutput(output) {
		this.$output = output;
		return this;
	}

	setError(error) {
		this.$$status = this.constructor.IS_ERRONEOUS;
		this.$error = error;
		return this;
	}

	exit() {
		this.$exit = true;
		return this;
	}

}

module.exports = Life;