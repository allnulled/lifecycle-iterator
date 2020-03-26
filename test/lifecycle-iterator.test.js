const {
	expect
} = require("chai");
const Life = require(__dirname + "/../src");

describe("LifecycleIterator", function() {

	it("works in general", function(done) {
		const lifecycle = Life.create({
			$scope: {
				onHi(arg, iterator) {
					// console.log("onHi", arg);
					return arg + 500;
				},
				onConverse(arg) {
					// console.log("onConverse", arg);
					return new Promise(ok => {
						setTimeout(() => {
							ok(arg + 1500);
						}, 500);
					});
				},
				onBye(arg) {
					// console.log("onBye", arg);
					return arg / 3 / 2;
				},
				onQueryOne(arg) {
					// console.log("onQueryOne", arg);
					return new Promise(ok => {
						setTimeout(() => {
							ok(arg + 1800);
						}, 200);
					});
				},
				onQueryTwo(arg) {
					// console.log("onQueryTwo", arg);
					return new Promise(ok => {
						setTimeout(() => {
							ok(arg + 1500);
						}, 300);
					});
				},
				onQueryThree(arg) {
					// console.log("onQueryThree", arg);
					return new Promise(ok => {
						setTimeout(() => {
							ok(arg + 1200);
						}, 400);
					});
				},
				onFormatResults(arg) {
					// console.log("onFormatResults", arg);
					return arg;
				}
			},
			$cycle: [
				"onHi",
				"onConverse",
				"onBye",
				"~onQueryOne",
				"~onQueryTwo",
				"~onQueryThree",
				"onFormatResults"
			],
			$success() {
				console.log("successssss")
			}
		});
		lifecycle.start(1000).then(output => {
			expect(output).to.deep.equal([2300, 2000, 1700]);
			expect(lifecycle.$trace).to.deep.equal([
				"onHi",
				"onConverse",
				"onBye",
				"~onQueryOne",
				"~onQueryTwo",
				"~onQueryThree",
				"onFormatResults"
			]);
			done();
		}).catch(done);
	});

	it("traces promises, named functions and anonymous functions", function(done) {
		const customTracer = [];
		const $scope = {
			async on1(data) {
				customTracer.push("on1");
				return data + 1;
			},
			on2(data) {
				customTracer.push("on2");
				return data + 2;
			},
			async on3(data) {
				customTracer.push("on3");
				return data + 3;
			},
		};
		const $cycle = ["on1", "on2", "on3"];
		const lifecycle = Life.create({
			$scope,
			$cycle,
			$success(data) {
				return new Promise(ok => {
					setTimeout(() => {
						customTracer.push("$success");
						ok(data);
					}, 400);
				});
			},
			$error(error) {
				customTracer.push("$error");
			},
			$complete(data) {
				return new Promise(ok => {
					setTimeout(() => {
						customTracer.push("$complete");
						ok(data);
					}, 400);
				});
			}
		});
		lifecycle.start(800).then(output => {
			expect(output).to.equal(806);
			expect(lifecycle.$trace).to.deep.equal(["on1", "on2", "on3"]);
			expect(customTracer).to.deep.equal(["on1", "on2", "on3", "$success", "$complete"]);
			done();
		}).catch(done);
	});

	it("does not need parameters", function(done) {
		Life.create().start().then(done)
	});

	it("handles errors in general", function(done) {
		const lc = Life.create({
			$cycle: ["onOne", "onTwo", "onThree"],
			$scope: {
				onOne(a) {
					return a + 1
				},
				onTwo(a) {
					return a + 2
				},
				async onThree(a) {
					throw new Error("onThreeError");
				},
			}
		});
		lc.start(0).then(data => {
			console.log(data);
		}).catch(error => {
			expect(error.message).to.equal("onThreeError");
			expect(lc.$trace).to.deep.equal(["onOne", "onTwo", "onThree"]);
			expect(lc.$$status).to.equal(Life.IS_ERRONEOUS);
			done();
		});
	});

	it("works with functions that return promises", function(done) {
		const lc = Life.create({
			$cycle: [
				(data) => new Promise(ok => {
					setTimeout(() => ok(data), 20);
				}),
				(data) => {
					return data + 10;
				},
				async function namedFunction1(data) {
					return data;
				},
				function namedFunction2(data) {
					return data + 1;
				},
				function namedFunction3(data, iterator) {
					iterator.$cycle.push(function namedFunction4(data) {
						return data + 7
					})
					return data + 2;
				}
			]
		});
		lc.start(500).then(data => {
			expect(data).to.equal(520);
			expect(lc.$trace).to.deep.equal([
				"{Function}",
				"{Function}",
				"{Function#namedFunction1}",
				"{Function#namedFunction2}",
				"{Function#namedFunction3}",
				"{Function#namedFunction4}"
			]);
			done();
		}).catch(console.log);
	});

	it("works with started promises", function(done) {
		const lc = Life.create({
			$cycle: [
				new Promise(ok => {
					setTimeout(ok, 100);
				}),
				new Promise(ok => {
					setTimeout(() => ok("Hi!"), 100);
				})
			]
		});
		lc.start(100).then(data => {
			expect(data).to.equal("Hi!");
			done();
		}).catch(console.log)
	});

	it("handles errors on cycle-functions", function(done) {
		const lc = Life.create({
			$cycle: [
				function() {},
				function errorFunction(data) {
					throw new Error("ErrorFunctionError");
				}
			]
		});
		lc.start(1000).then(console.log).catch(error => {
			expect(error.message).to.equal("ErrorFunctionError");
			expect(lc.$trace).to.deep.equal(["{Function}", "{Function#errorFunction}"]);
			done();
		});
	});

	it("handles errors on method-functions", function(done) {
		const lc = Life.create({
			$scope: {
				onNotThrow() {

				},
				onThrow() {
					throw new Error("ErrorFunctionError");
				}
			},
			$cycle: ["onNotThrow", "onThrow"]
		});
		lc.start(1000).then(console.log).catch(error => {
			expect(error.message).to.equal("ErrorFunctionError");
			done();
		});
	});

	it("handles errors on promises", function(done) {
		const lc = Life.create({
			$cycle: [
				function namedFunction4() {},
				new Promise((ok, fail) => {
					setTimeout(() => {
						fail(new Error("PromiseError"));
					}, 200);
				})
			]
		});
		lc.start(1000).then(console.log).catch(error => {
			expect(error.message).to.equal("PromiseError");
			expect(lc.$trace).to.deep.equal(["{Function#namedFunction4}", "{Promise}"]);
			done();
		});
	});

	it("handles errors on cycle-functions", function(done) {
		const lc = Life.create({
			$scope: {},
			$cycle: [
				function() {},
				function errorFunction(data) {
					throw new Error("ErrorFunctionError");
				}
			]
		});
		lc.start(1000).then(console.log).catch(error => {
			expect(error.message).to.equal("ErrorFunctionError");
			expect(lc.$trace).to.deep.equal(["{Function}", "{Function#errorFunction}"]);
			done();
		});
	});

	it("allows the pass of direct values", function(done) {
		const lc = Life.create({
			$cycle: [
				500,
				function namedFunction5(data) {
					return data + 5000;
				}
			]
		});
		lc.start(1000).then(data => {
			expect(data).to.equal(5500);
			expect(lc.$trace).to.deep.equal(["{number}", "{Function#namedFunction5}"]);
			done();
		}).catch(console.log);
	});

	it("creates races", function(done) {
		const lc = Life.create({
			$scope: {
				runner1() {
					return new Promise((ok, fail) => {
						setTimeout(() => ok(1), 500);
					});
				},
				runner2() {
					return new Promise((ok, fail) => {
						setTimeout(() => ok(2), 400);
					});
				},
				runner3() {
					return new Promise((ok, fail) => {
						setTimeout(() => ok(3), 200);
					});
				},
				onSetOutput(data) {
					return data + 3;
				}
			},
			$cycle: ["~~runner1", "~~runner2", "~~runner3", "onSetOutput"]
		});
		lc.start().then(output => {
			expect(output).to.equal(6);
			expect(lc.$trace).to.deep.equal(["~~runner1", "~~runner2", "~~runner3", "onSetOutput"]);
			done();
		}).catch(console.log);
	});

	it("prevents errors by non-existent methods", function(done) {
		const lc = Life.create({
			$scope: {
				named() {}
			},
			$cycle: ["named", "unnamed"]
		});
		lc.start().then(console.log).catch(error => {
			expect(error.message).to.equal("CycleNotFoundError");
			expect(lc.$trace).to.deep.equal(["named"]);
			done();
		});
	});

	it("prevents errors by non-existent methods in a parallel group", function(done) {
		const lc = Life.create({
			$scope: {
				named() {
					return 400;
				}
			},
			$cycle: ["~named", "~unnamed"]
		});
		lc.start().then(console.log).catch(error => {
			expect(error.message).to.equal("CycleNotFoundError");
			expect(lc.$trace).to.deep.equal(["~named"]);
			done();
		});
	});

	it("prevents errors by non-existent methods in a race group", function(done) {
		const lc = Life.create({
			$scope: {
				named() {
					return 500;
				}
			},
			$cycle: ["~~named", "~~unnamed"]
		});
		lc.start().then(console.log).catch(error => {
			expect(error.message).to.equal("CycleNotFoundError");
			expect(lc.$trace).to.deep.equal(["~~named"]);
			done();
		});
	});

	it("allows race groups only with named methods", function(done) {
		const lc = Life.create({
			$scope: {
				named() {
					return new Promise(ok => ok(500));
				}
			},
			$cycle: ["~~named", (data) => data + 200]
		});
		lc.start().then(data => {
			expect(lc.$trace).to.deep.equal(["~~named", "{Function}"]);
			expect(data).to.equal(700);
			done();
		}).catch(console.log);
	});

	it("allows parallel groups only with named methods", function(done) {
		const lc = Life.create({
			$scope: {
				named() {
					return 500;
				},
				named2() {
					return new Promise(ok => ok(200));
				}
			},
			$cycle: ["~named", "~named2", (data) => data[0] + data[1] + 200]
		});
		lc.start().then(data => {
			expect(lc.$trace).to.deep.equal(["~named", "~named2", "{Function}"]);
			expect(data).to.equal(900);
			done();
		}).catch(console.log);
	});

	it("allows to exit abruptly with errors", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					lc.setError(new Error("Custom message")).exit();
				},
				on3() {
					return 400;
				},
			},
		});
		lc.start().then(console.log).catch(error => {
			expect(error.message).to.equal("Custom message");
			expect(lc.$error.message).to.equal("Custom message");
			expect(lc.$trace).to.deep.equal(["on1", "on2"]);
			expect(lc.$exit).to.equal(true);
			done();
		}).catch(console.log);
	});

	it("allows to exit abruptly setting the output in the same line", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					lc.setOutput(500).exit();
				},
				on3() {
					return 400;
				},
			},
		});
		lc.start().then(output => {
			expect(output).to.equal(500);
			expect(lc.$trace).to.deep.equal(["on1", "on2"]);
			expect(lc.$exit).to.equal(true);
			done();
		}).catch(console.log);
	});

	it("allows to exit and pass the output in the same function", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					lc.exit();
					return 200;
				},
				on3() {
					return 400;
				},
			},
		});
		lc.start().then(output => {
			expect(output).to.equal(200);
			expect(lc.$trace).to.deep.equal(["on1", "on2"]);
			expect(lc.$exit).to.equal(true);
			done();
		}).catch(console.log);
	});

	it("works as a promise when it is recalled (on success)", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					return 200;
				},
				on3() {
					return 400;
				},
			}
		});
		lc.start().then(output => {
			expect(output).to.equal(400);
			lc.start().then(output => {
				expect(output).to.equal(400);
				expect(lc.$trace).to.deep.equal(["on1", "on2", "on3"]);
				lc.start(500).then(output => {
					expect(output).to.equal(500);
					done();
				}).catch(console.log);
			}).catch(console.log);
		}).catch(console.log);
	});

	it("works as a promise when it is recalled (on error)", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					lc.setError(new Error("Custom message 2")).exit();
				},
				on3() {
					return 400;
				},
			}
		});
		lc.start().then(console.log).catch(error => {
			expect(lc.$$status).to.equal(Life.IS_ERRONEOUS);
			expect(error.message).to.equal("Custom message 2");
			lc.start().then(console.log).catch(error => {
				expect(error.message).to.equal("Custom message 2");
				done();
			});
		});
	});

	it("works as a promise when it is recalled (on error and not exited)", function(done) {
		const lc = Life.create({
			$cycle: ["on1", "on2", "on3"],
			$scope: {
				on1() {
					return 600;
				},
				on2() {
					lc.setError(new Error("Custom message 2"));
				},
				on3() {
					return 400;
				},
			}
		});
		lc.start().then(console.log).catch(error => {
			expect(lc.$$status).to.equal(Life.IS_ERRONEOUS);
			expect(error.message).to.equal("Custom message 2");
			lc.start().then(console.log).catch(error => {
				expect(error.message).to.equal("Custom message 2");
				done();
			});
		});
	});

	it("works with the 100% sync example on readme", function(done) {
		const iterator = Life.create({
			$cycle: ["onStart", "onProcess", "onEnd"],
			$scope: {
				onStart(data) {
					return data + 10
				},
				onProcess(data) {
					return data + 2
				},
				onEnd(data) {
					return data + 300
				},
			},
			$output: "default output",
			$success() {
				// console.log("Exited successfully");
			},
			$failure() {
				// console.log("Exited erroneously");
			},
			$complete() {
				// console.log("Exited finally");
			},
		});
		iterator.start(1000).then(output => {
			expect(output).to.equal(1312); // >> 1312
			expect(iterator.$trace).to.deep.equal(["onStart","onProcess","onEnd"]); // >> [ "onStart", "onProcess", "onEnd" ]
			done();
		}).catch(console.log);
	});

	it("works with the 100% async example on readme", function(done) {
		const iterator = Life.create({
			$cycle: ["onStart", "onProcess", "onEnd"],
			$scope: {
				onStart(data) {
					return new Promise(ok => {ok(data + 10)});
				},
				onProcess(data) {
					return new Promise(ok => {ok(data + 2)});
				},
				onEnd(data) {
					return new Promise(ok => {ok(data + 300)});
				},
			},
			$output: "default output",
			$success() {
				// console.log("Exited successfully");
			},
			$failure() {
				// console.log("Exited erroneously");
			},
			$complete() {
				// console.log("Exited finally");
			},
		});
		iterator.start(1000).then(output => {
			expect(output).to.equal(1312); // >> 1312
			expect(iterator.$trace).to.deep.equal(["onStart","onProcess","onEnd"]); // >> [ "onStart", "onProcess", "onEnd" ]
			done();
		}).catch(console.log);
	});

	it("passes the iterator to the functions and methods as the last parameter", function(done) {
		const iterator = Life.create({
			$extraParameter: 900,
			$cycle: [
				function(data, iterator) {
					return new Promise(ok => {
						setTimeout(() => ok(iterator.$extraParameter + data + 10), 100);
					})
				}, 
				function(data) {
					return new Promise(ok => {
						setTimeout(() => ok(data + 1000), 100);
					})
				}
			]
		});
		iterator.start(1).then(output => {
			expect(output).to.equal(1911);
			done();
		}).catch(console.log);
	});


	/*
	provocar errores en una función de ciclo.
	provocar errores en una promesa de ciclo.
	provocar errores en un método de instancia de ciclo.

	*/

});