const {
	expect
} = require("chai");
const Life = require(__dirname + "/../src");

describe("LifecycleIterator complex example", function() {

	it("works with the complex example", function(done) {
		this.timeout(10 * 1000);
		// First lifecycle:
		const iterator = Life.create({
			$cycle: [
				"onAsyncFunction",
				"onSyncFunction",
				"onAsyncLambda",
				"onSyncLambda",
				"onNestedIterator",
			],
			$scope: {
				onAsyncFunction: async function(data) {
					await new Promise(ok => {
						setTimeout(ok, 100)
					});
					return data.concat(["onAsyncFunction"]);
				},
				onSyncFunction: function(data) {
					return data.concat(["onSyncFunction"]);
				},
				onAsyncLambda: async (data) => {
					await new Promise(ok => {
						setTimeout(ok, 100)
					});
					return data.concat(["onAsyncLambda"]);
				},
				onSyncLambda: (data) => {
					return data.concat(["onSyncLambda"]);
				},
				onNestedIterator(data) {
					// Second lifecycle:
					return Life.create({
						$cycle: [
							async function(data) {
								await new Promise(ok => {
									setTimeout(ok, 100);
								});
								return data.concat(["async function(data)"]);
							},
							function(data) {
								data = data.concat(["function(data)"]);
								return data;
							},
							async (data) => {
								await new Promise(ok => {
									setTimeout(ok, 100);
								});
								return data.concat(["async (data)"]);
							},
							(data) => {
								return data.concat(["(data)"]);
							},
							function(data) {
								// Third lifecycle:
								return Life.create({
									$cycle: [
										"onStart",
										"~~onSourceOne",
										"~~onSourceTwo",
										"~~onSourceThree",
										"~onExtractDataOne",
										"~onExtractDataTwo",
										"~onExtractDataThree",
										"onUnify",
										"onEnd",
									],
									$scope: {
										onStart(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["onStart"]));
												}, 100);
											})
										},
										onSourceOne(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~~onSourceOne"])); // NO!
												}, 500);
											})
										},
										onSourceTwo(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~~onSourceTwo"])); // NO!
												}, 300);
											})
										},
										onSourceThree(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~~onSourceThree"]));
												}, 100);
											})
										},
										onExtractDataOne(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~onExtractDataOne"]));
												}, 300);
											})
										},
										onExtractDataTwo(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~onExtractDataTwo"]));
												}, 100);
											})
										},
										onExtractDataThree(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["~onExtractDataThree"]));
												}, 200);
											})
										},
										onUnify(data) {
											let base = data[0];
											base = base.concat(data[1][data[1].length-1]);
											base = base.concat(data[2][data[2].length-1]);
											return base.concat(["onUnify"]);
										},
										onEnd(data) {
											return new Promise(ok => {
												setTimeout(() => {
													ok(data.concat(["onEnd"]));
												}, 100);
											})
										},
									}
								}).start(data);
							}
						]
					}).start(data)
				},
			},
			$output: "default output",
			$success() {
				//console.log("Exited successfully");
			},
			$failure() {
				//console.log("Exited erroneously");
			},
			$complete() {
				//console.log("Exited finally");
			},
		});

		iterator.start([]).then(output => {
			expect(output).to.deep.equal([
				'onAsyncFunction',
				'onSyncFunction',
				'onAsyncLambda',
				'onSyncLambda',
				'async function(data)',
				'function(data)',
				'async (data)',
				'(data)',
				'onStart',
				'~~onSourceThree',
				'~onExtractDataOne',
				'~onExtractDataTwo',
				'~onExtractDataThree',
				'onUnify',
				'onEnd'
			]);
			done();
		}).catch(console.log);
	});

});