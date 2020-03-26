const {
	expect
} = require("chai");
const Liit = require(__dirname + "/../src/index.js");

describe("LifecycleIterator (Liit) class", function() {

	it("works as expected", function(done) {
		this.timeout(6000);
		return Liit.create({
			life: ["onInput", "onProcess", "onOutput"],
			scope: {
				onInput(arg, iterator) {
					return arg / 3;
				},
				onProcess(arg, iterator) {
					return new Promise(success => {
						setTimeout(() => {
							success(arg * 2);
						}, 100);
					});
				},
				onOutput(arg, iterator) {
					return arg + 1;
				},
				onGoOut(arg, iterator) {
					iterator.exit(arg);
				}
			},
			onSuccess: (data) => {
				const {
					output,
					iterator
				} = data;
				expect(output).to.equal(9);
				iterator.relive(["onInput", "onProcess", "onProcess", "onProcess", "onGoOut", /*and never reached:*/ "onOutput"], output, {
					onSuccess: (data) => {
						const {
							output,
							iterator
						} = data;
						expect(output).to.equal(24);
						expect(iterator.$trace).to.deep.equal(["onInput", "onProcess", "onOutput", "onInput", "onProcess", "onProcess", "onProcess", "onGoOut"]);
						expect(iterator.$index).to.deep.equal(iterator.$trace.length);
						done();
					},
					onError: done
				});
			},
			onError: done,
		}).next(12);
	});

	it("works with the readme example", function(done) {
		Liit.create({
			life: ["plusTwo", "plusThree", "plusEleven", "plusHundred"],
			scope: {
				plusTwo: (out) => out + 2,
				plusThree: (out) => out + 3,
				plusEleven: (out) => out + 11,
				plusHundred: async (out) => {
					await new Promise(success => setTimeout(success, 100));
					return out + 100;
				},
			},
			onSuccess: (data) => {
				const {
					output
				} = data;
				expect(output).to.equal(216); // = 216
				return done();
			},
		}).next(100);
	});

	it("handles sync errors calling onError and onFinish", function(done) {
		const tracer = [];
		const lifeseed = {
			a() {
				tracer.push("a");
			},
			b() {
				tracer.push("b");
			},
			c: async () => {
				tracer.push("c");
				await new Promise(ok => setTimeout(ok, 100));
				await new Promise((onSuccess, onError) => {
					Liit.create({
						life: ["a", "b"],
						scope: lifeseed,
						onSuccess,
						onError,
					}).next();
				});
				return 5;
			},
			d: async (param) => {
				tracer.push("d" + param);
				throw new Error("D causes error");
			}
		};
		Liit.create({
			life: ["a", "b", "c", "d"],
			scope: lifeseed,
			onSuccess: (data) => {
				return done(new Error("This life should not be successfully done!"));
			},
			onError: (error) => {
				expect(tracer).to.deep.equal(["a", "b", "c", "a", "b", "d5"]);
				expect(error.message).to.equal("D causes error");
			},
			onFinish: (data, error) => {
				expect(data).to.equal(undefined);
				expect(error.message).to.equal("D causes error");
				done();
			}
		}).next(100);
	});

	it("works well as promise too", (done) => {
		Liit.create({
			life: ["onAdd100", "onMultiplyPer2", "onSubstract10Asynchronously"],
			scope: {
				onAdd100: (data) => data + 500, // 100 + 500 = 600
				onMultiplyPer2: (data) => data * 2, // 600 * 2 = 1200
				onSubstract10Asynchronously: (data) => {
					return new Promise((ok, fail) => {
						setTimeout(() => ok(data - 10), 1000)
					});
				} // 1200 - 10 = 1190
			}
		})
		.promise(100)
		.then(({ output }) => { expect(output).to.equal(1190); done(); })
		.catch(error => {throw error});
	});

	it("handles method errors calling onError and onFinish", (done) => {
		const tracer = [];
		Liit.create({
			life: ["ok1","ok2"],
			scope: {
				ok1() {
					throw new Error("ok");
				},
				ok2() {

				}
			},
			onError(error) {
				tracer.push("onError");
			},
			onFinish(data, error) {
				tracer.push("onFinish");
			}
		})
		.promise(90)
		.catch(error => {
			expect(error.message).to.equal("ok");
			console.log(tracer);
		})
	});

});