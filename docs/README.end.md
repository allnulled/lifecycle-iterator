## API

### Cheat sheet

```js
LifecycleIterator.create({
	$scope: {...},
	$cycle: [
		"method1",
		"~method2parallel",
		"~method3parallel",
		"~method4parallel",
		"~~method5race",
		"~~method6race",
		"~~method7race",
		Promise.all([promise1, promise2, promise3]),
		Promise.race([runner1, runner2, runner3]),
		new Promise(ok => setTimeout(ok, 1000)),
		function(data) => {return new Promise(ok => setTimeout(ok, 1000))},
		(data, iterator) => new Promise(ok => setTimeout(ok, 1000)),
		(data, iterator) => LifecycleIterator.create({
			$scope: {...},
			$cycle: [...],
			// $success(data) {},
			// $failure(error) {},
			// $complete(data) {},
			// $output: undefined,
			// $error: [],
			// $trace: [],
			// $index: 0,
			// $$status,
		}).start(data),
		(data, iterator) => {
			iterator.setOutput(data);
			iterator.setError(new Error("Whatever"));
			iterator.exit();
		}
	]
}).start(startData).then(output => {
	//...
}).catch(error => {

});
```

### License

This project is under [WTFPL](https://es.wikipedia.org/wiki/WTFPL).

### Issues

Please, any issue or suggestion, [here](https://github.com/allnulled/lifecycle-iterator/issues).

