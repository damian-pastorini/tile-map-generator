# Generating Maps From the Command Line

This document explains the `reldens-generate-map` command: a SINGLE file that maps command parameters to one of the nine example scripts under `examples/`, runs it, and prints the full path of every map file the run wrote to disk. The command does NOT reimplement any generation flow. It is only a wrapper: it requires the example file, instantiates the exported class, awaits `execute()`, and reads the paths back from the generators the example kept.

## The command file

`bin/reldens-generate-map.js` holds the whole command in the `ReldensGenerateMap` class:

- The constructor holds `this.examples`, a flat map from the sorted parameters key to the example path relative to `examples/`, and configures the `Logger` for terminal output.
- `fetchFlags()` normalizes the parameters from `process.argv`, falling back to the `npm_config_*` environment variables when no arguments were forwarded.
- `execute()` looks up the example, and prints the usage when the combination does not match.
- `runExample()` requires the example file, instantiates its FIRST export, and awaits `execute()`.
- `printGeneratedMaps()` and `collectGenerators()` read `mapFileFullPath` from the example `generators` and from the `generators` of each entry in `associatedMaps`.

The `package.json` entries added for it:

- `"bin": {"reldens-generate-map": "bin/reldens-generate-map.js"}` - exposes the command when the package is installed.
- `"scripts": {"reldens-generate-map": "node bin/reldens-generate-map.js"}` - exposes the command inside the package itself.

## How to run

Run from the package root `D:/dap/work/reldens/npm-packages/tile-map-generator`.

```bash
npm run reldens-generate-map -- --composite
```

The `--` separator is the RELIABLE form, because `npm run` consumes `--`-prefixed flags as its own configuration instead of forwarding them to the script. The command also accepts the form without the separator:

```bash
npm run reldens-generate-map --composite
```

That works because npm exports every unknown command line flag as an `npm_config_*` environment variable, and `fetchFlags()` reads those when `process.argv` carries no forwarded argument. Recent npm versions print an `Unknown cli config` warning for that form; the `--` form does not warn.

Running with no parameters, or with a combination that does not match, prints the usage and every available combination, and exits with code `1`.

## Available parameters

The parameters are order independent: `fetchFlags()` sorts them before the lookup, so `--composite --with-loader` and `--with-loader --composite` resolve to the same example. The combination must match a `this.examples` key EXACTLY.

- `--composite` - `examples/layer-elements-composite/generate.js`
- `--composite --with-loader` - `examples/layer-elements-composite/generate-with-loader.js`
- `--composite --dungeon --with-loader` - `examples/layer-elements-composite/generate-with-loader-dungeon.js`
- `--composite --multiple-with-names` - `examples/layer-elements-composite/generate-multiples-with-names.js`
- `--composite --multiple-with-names --with-loader` - `examples/layer-elements-composite/generate-with-loader-multiples-with-names.js`
- `--composite --multiple-with-associations` - `examples/layer-elements-composite/generate-multiples-with-associations.js`
- `--composite --multiple-with-associations --with-loader` - `examples/layer-elements-composite/generate-with-loader-multiples-with-associations.js`
- `--object` - `examples/layer-elements-object/generate.js`
- `--object --with-loader` - `examples/layer-elements-object/generate-with-loader.js`

The parameter is `--multiple-with-associations` while the file name is `generate-multiples-with-associations.js`. The parameters are NOT derived from the file names, they are mapped explicitly, so the singular and plural difference is intentional.

`--dungeon` only exists in the `--composite --with-loader` form, and the `--object` family has no dungeon or multiple variants.

## How the examples expose their generators

Every example is a class whose name is the file name in capitalized camel case, and every class follows the same contract:

- The constructor initializes `this.generators`, and `this.associatedMaps` for the association flows, so the containers exist before anything runs.
- `async execute()` performs the generation and stores each `RandomMapGenerator` under `this.generators[mapName]` BEFORE calling `generate()`, so a failure part way through still leaves the already created generators reachable.
- The bottom of the file keeps the direct invocation behind a guard:

```javascript
if(require.main === module){
    (new Generate()).execute();
}
```

That guard is what makes the file safe to require. Running `node examples/layer-elements-composite/generate.js` behaves exactly as before; requiring the same file from the command only defines the class.

`runExample()` takes the FIRST export of the required module, which is the same discovery convention `tests/run.js` uses for test classes, so no export name has to be registered anywhere.

The two loader driven multiple flows do not build their own generators, they copy the containers off the orchestrator after it runs:

```javascript
await generator.generate();
this.generators = generator.generators;
this.associatedMaps = generator.associatedMaps;
```

`examples/layer-elements-composite/generate-multiples-with-associations.js` previously dropped its `AssociatedMaps` instance on every loop iteration. It now stores it as `this.associatedMaps[mapName]`, which retains the same object instead of discarding it. Nothing else about that flow changed.

## How the generated map paths are collected

`RandomMapGenerator` assigns `this.mapFileFullPath` in `assignBaseOptions` (`lib/random-map-generator.js:217`) and writes the file at `lib/random-map-generator.js:458`. That property is the ONLY place a written map path exists, and `generate()` returns the Tiled map object rather than the path.

`collectGenerators()` reads it from two places only: the example `generators`, and the `generators` of every `associatedMaps` entry. `AssociatedMaps` holds sub-maps AND floors in one flat `generators` object, so a single pass reaches every interior and every floor.

A path is only reported when `FileHandler.isFile()` confirms the file exists, because `mapFileFullPath` is assigned before generation and survives the two failure returns in `generate()`, which are the validation failure and the tilesheet copy failure.

## Output

`Logger` is silent by default in this package: `log()` drops any level above `RELDENS_LOG_LEVEL`, which is `0` when unset, so even `Logger.critical` prints nothing. The command follows the same approach as `tests/run.js` and reserves a dedicated level for terminal output:

```javascript
Logger.activeLogLevels = [this.outputLogLevel];
Logger.setLogLevel(this.outputLogLevel);
Logger.addTimeStamp = false;
```

A non-empty `activeLogLevels` is an exclusive allow-list, so the command output is not mixed with the generator internal logging. Each generated map is printed on its own line:

```bash
 - Generated map: D:\dap\work\reldens\npm-packages\tile-map-generator\examples\layer-elements-composite\generated\town-001.json
```

The leading ` - ` is produced by `Logger.log()`, which always prefixes the timestamp and the level label; with the timestamp disabled and an empty label the prefix collapses to a single dash.

The exit code is `0` when the example completed, and `1` when the parameters were missing or invalid, or when the example threw. When the example throws part way through, the maps already written are still printed before the failure exit.

## Known constraints

- The `--composite`, `--composite --with-loader`, `--object` and `--object --with-loader` combinations do not set a `mapName`, so their output file is named `random-map-<date>.json` and differs on every run. The printed path is read back from the generator, never predicted.
- Sub-map and floor names in the association flows derive from the change-points generated at runtime, so they cannot be enumerated before the run.
- `rootFolder` stays `__dirname` in every example. The loaders and the optimizer resolve every composite JSON and tileset PNG relative to it, and the `generated` output folder is built from it, so the command works the same no matter which directory it is invoked from.
