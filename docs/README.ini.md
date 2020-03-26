# lifecycle-iterator

Iterator for sync/async methods and functions.

## Install

`$ npm i -s lifecycle-iterator`

## Why?

To have a simple way to concatenate `sync/async` operations.

To reuse a powerful programming pattern for lifecycles of the *object-oriented programming*.

To have a nice and flexible API for lifecycles.

## Usage

### Simple demo

```js
const LifecycleIterator = require("lifecycle-iterator");

LifecycleIterator.create({
    $scope: {
        onStart(data) {
            return new Promise(ok => {
                setTimeout(() => {
                    ok(data + 100);
                }, 100);
            });
        },
        onEnd(data) {
            return data + 200;
        }
    },
    $cycle: ["onStart", "onEnd"]
}).start(50).then(output => {
    expect(output).to.equal(350);
}).catch(console.log);
```

### Explanation

The API is a simple class that represents an async/sync lifecycle iterator.

It accepts a `$cycle` parameter, by which you define the cycle of callbacks for this lifecycle. It can be:

   - A `Function` that returns a `Promise` (for asynchronous steps).
   - A `Function` that does not return a `Promise` (for synchronous steps).
   - A `Promise` (for asynchronous operations to be completed).
   - A `String` that points to a `$scope`'s function. They can be prefixed (or not) by:

       - `~`: indicating the start of a `parallel group`, they start at the same time, but they end when all of them are finished. It returns an `Array` of values for every item of the group.
       - `~~`: indicating the start of a `racing group`, they start at the same time, but they end when the first of them is finished. It returns only a single value for the first item that finished.

   - Any other value, which will be treated as a final value.

It also accepts a `$scope` parameter, by which you define the object where the names of the `$cycle` parameter pick their represented functions.

It also accepts a `$output` parameter, by which you define the default output.

It also accepts a `$success`, `$failure` and `$complete` parameters, functions called one the lifecycle was finished successfully, erroneously or in any case, respectively.

Moreover, you can access the `iterator` instance by the last of the parameters of each function called.

With the `iterator` instance, you also have these methods:

   - `iterator.start(...data)`: to start the lifecycle passing some initial values. It returns a `Promise`.
   - `iterator.exit()`: to exit before starting the next cycle. It returns the iterator itself.
   - `iterator.setOutput(data)`: to set the output of the lifecycle. It returns the iterator itself.
   - `iterator.setError(error)`: to set the status of erroneous, and the error you want to throw. It returns the iterator itself.

The `iterator.start()` method returns a `Promise` representing the whole lifecycle, which you can use to continue coding after the lifecycle exits, successfully or erroneously. This way, you do not need to use the `$success`, `$failure` and `$complete` properties of the iterator (which are also accepted).

With this class, you can speed up the process of creating asynchronous code under **parallel, series or race** approaches.

   - **In series**, this is the default approach of the API.

   - **In parallel**, all the methods will be called at the same time, and the solution are all of them in an array.

   - **In race**, all the methods will be called at the same time, but the solution is only the first of them solved.

Moreover, the `iterator.$trace` is a special array that will remember all the steps the iterator has taken. There, you can have a vague clue of what has this iterator gone through.

This approach lets you also modify on the fly the lifecycle, from the same lifecycle.

It is a bit complex, but it is worthy, I think, that is why I did it.

This can structure a lot the code you need for complex async/sync concatenation of operations, without sacrificing flexibility.




## Examples

### Simple 100% synchronous example:

```js
const LifecycleIterator = require("lifecycle-iterator");

const iterator = LifecycleIterator.create({
	$cycle: ["onStart", "onProcess", "onEnd"],
	$scope: {
		onStart(data) {return data + 10},
		onProcess(data) {return data + 2},
		onEnd(data) {return data + 300},
	},
	$output: "default output",
	$success() { console.log("Exited successfully"); },
	$failure() { console.log("Exited erroneously"); },
	$complete() { console.log("Exited finally"); },
});

iterator.start(1000).then(output => {
	console.log(output); // >> 1312
	console.log(iterator.$trace); // >> [ "onStart", "onProcess", "onEnd" ]
}).catch(console.log);
```

### Same example but 100% asynchronous:

```js
const iterator = LifecycleIterator.create({
	$cycle: ["onStart", "onProcess", "onEnd"],
	$scope: {
		onStart(data) {return new Promise(ok => {ok(data + 10)})},
		onProcess(data) {return new Promise(ok => {ok(data + 2)})},
		onEnd(data) {return new Promise(ok => {ok(data + 300)})},
	},
	$output: "default output",
	$success() { console.log("Exited successfully"); },
	$failure() { console.log("Exited erroneously"); },
	$complete() { console.log("Exited finally"); },
});

iterator.start(1000).then(output => {
	console.log(output); // >> 1312
	console.log(iterator.$trace); // >> [ "onStart", "onProcess", "onEnd" ]
}).catch(console.log);
```

### Example of `setOutput` method:

```js
LifecycleIterator.create({
    $cycle: [
        function(iterator) {
            iterator.setOutput(500);
        },
        function() {
            console.log("If nothing is returned, the $output property is the last value returned");
        }
    ]
}).start().then(output => {
    expect(output).to.equal(500);
}).catch(console.log);
```

### Example of `setError` method:

```js
LifecycleIterator.create({
    $cycle: [
        function(iterator) {
            iterator.setError(new Error("ok"));
        },
        function() {
            console.log("This is still executed. Returning anything is useless.");
        }
    ]
}).start().then(console.log).catch(error => {
    expect(error.message).to.equal("ok");
});
```

### Example of `exit` method:

```js
LifecycleIterator.create({
    $cycle: [
        function(iterator) {
            iterator.setOutput(400).exit();
        },
        function() {
            console.log("This is never executed.");
        }
    ]
}).start().then(output => {
    expect(output).to.equal(400);
}).catch(console.log);
```

### Example of `race group`:

```js
LifecycleIterator.create({
    $cycle: [
        "~~viaA",
        "~~viaB",
    ],
    $scope: {
        viaA() {
            return new Promise(ok => {
                setTimeout(() => ok(1), 200);
            })
        },
        viaB() {
            return new Promise(ok => {
                setTimeout(() => ok(2), 100);
            })
        }
    }
}).start().then(output => {
    expect(output).to.equal(2);
}).catch(console.log);
```

### Example of `parallel group`:

```js
LifecycleIterator.create({
    $cycle: [
        "~viaA",
        "~viaB",
    ],
    $scope: {
        viaA() {
            return new Promise(ok => {
                setTimeout(() => ok(1), 200);
            })
        },
        viaB() {
            return new Promise(ok => {
                setTimeout(() => ok(2), 100);
            })
        }
    }
}).start().then(output => {
    expect(output).to.deep.equal([1,2]);
}).catch(console.log);
```

### Example of synchronous and asynchronous functions, and nested lifecycle-iterators:

This example is a bit more complex.

The first iterator demonstrates how to use the `$scope` attribute to concatenate calls.

The second iterator demonstrates how to use directly the `$cycle` to concatenate functions and lambdas.

The third iterator, finally, demonstrates how to use `"~"` and `"~~"` to make `parallel` and `racing` groups of calls easily.

Direct `Promises` are excluded from this example because when you concatenate a `Promise`, you cannot receive the parameter of the previous subcycle.

The example uses the `expect` expression of testing to demonstrate that the cycle of callbacks is respected exactly as expected.

```js
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
                                    console.log("onUnify")
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
        console.log("Exited successfully");
    },
    $failure() {
        console.log("Exited erroneously");
    },
    $complete() {
        console.log("Exited finally");
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
}).catch(console.log);
```