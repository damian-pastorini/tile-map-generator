# Generating a Town With Inner Houses

This document explains how the example scripts generate a town SURFACE map and, for every house element on that surface, a SEPARATE connected INTERIOR sub-map ("inner house") that the player can explore. Each house is linked to its interior through doors expressed as paired `change-points` and `return-point` layers, so entering a house door teleports the player into the generated interior map and exiting drops the player back outside. Multiple towns are generated in sequence and chained together at opposite edges by a continuous main path (`previousMainPath`), producing a connected overworld of towns whose houses are individually enterable.

## The example files

All canonical files live under `examples/layer-elements-composite/`.

The canonical "town with explorable inner houses" script is:

- `examples/layer-elements-composite/generate-with-loader-multiples-with-associations.js` - instantiates `MultipleWithAssociationsByLoaderGenerator` and calls `generate()`.

Its data and asset inputs:

- Data config: `examples/layer-elements-composite/map-composite-data-with-associations.json` - holds the generation options, the `mapsInformation` list of towns (`town-001`..`town-004`), the `associationsProperties` block, and `compositeElementsFile`.
- Town SURFACE composite Tiled map: `examples/layer-elements-composite/reldens-town-composite-with-associations.json` - one Tiled JSON containing the `ground`/`path` layers plus the house element layer groups and their per-house `change-points`/`return-point` layers.
- House INTERIOR composite Tiled map: `examples/layer-elements-composite/house-composite.json` - a full Tiled map of room/bed/table/walls/stairs element groups; it carries its own `stairs-up`/`stairs-down` `change-points` and `return-point` layers so an interior can chain to further floors.
- Town surface tileset PNGs: `examples/layer-elements-composite/outside.png`, `examples/layer-elements-composite/terrain.png`, `examples/layer-elements-composite/house.png`, `examples/layer-elements-composite/doors.png`, `examples/layer-elements-composite/water.png`.
- Interior tileset PNG: `examples/layer-elements-composite/inside.png` (embedded in `house-composite.json` and also pre-embedded in the town-with-associations composite).

A manual (no-loader) equivalent that produces a comparable result with the steps wired by hand is:

- `examples/layer-elements-composite/generate-multiples-with-associations.js` - for each town it runs `RandomMapGenerator` directly and then constructs `AssociatedMaps` and calls `associatedMaps.generate(...)`. It hard-codes `mapsInformation` and the town options inline. Compared with the loader data config `map-composite-data-with-associations.json`, the manual town options differ in four values: `expandElementsSize` (`1` in the manual script vs unset/default `0` in the loader), `collisionLayersForPaths` (`['change-points', 'collisions']` manual vs `['change-points', 'collisions', 'tree-base']` loader), `freeSpaceTilesQuantity` (`1` vs `2`), and `freeTilesMultiplier` (`4` vs `2`). The last three feed map sizing and placement, so the generated output is NOT identical between the two scripts; only the pipeline is. The `associationsProperties` block IS identical between the two scripts.

### Related examples and how they differ

The examples ship in two families:

- `examples/layer-elements-object/` feeds raw, separate element layer files (`house-001.json`, `house-002.json`, `tree.json`) plus a flat `tilesheet.png` into a single `RandomMapGenerator`. `generate.js` builds the options inline; `generate-with-loader.js` moves the same config into `map-data.json` and loads it with `LayerElementsObjectLoader` (resolving `layerElementsFiles`). Both produce ONE map and no interiors.
- `examples/layer-elements-composite/` takes a pre-laid-out composite Tiled map and splits it back into placeable elements through `RandomMapGenerator.fromElementsProvider`.

Within the composite family, the scripts differ by behavior:

- Single map, inline composite: `generate.js` (requires `reldens-town-composite.json` directly).
- Single map, loader-driven: `generate-with-loader.js` + `map-composite-data.json`.
- Multiple named maps, manual loop: `generate-multiples-with-names.js`.
- Multiple named maps, loader-driven: `generate-with-loader-multiples-with-names.js` + `map-composite-data-with-names.json` (uses `MultipleByLoaderGenerator`, reads `mapNames`).
- Multiple maps WITH interiors (associations): `generate-with-loader-multiples-with-associations.js` (canonical) and `generate-multiples-with-associations.js` (manual).
- Dungeon: `generate-with-loader-dungeon.js` + `map-composite-data-dungeon.json` (cave/wall generation).

The association flow is the ONLY one that produces interior sub-maps, because it is the only one that runs `AssociatedMaps.generate()`. Note that `generate-with-loader-dungeon.js` does NOT produce interiors even though `reldens-dungeon-composite.json` contains `house-*-change-points` layers, because it never calls `AssociatedMaps`; it instantiates a single `RandomMapGenerator`.

## Requirements

### Runtime dependencies

From `package.json` (no build step, the only npm script is `test`), four runtime dependencies are needed:

- `@reldens/tile-map-optimizer` - its `TileMapOptimizer` is run by `ElementsProvider.optimizeMap()` to merge the multiple source tilesets into ONE optimized tilesheet PNG plus a re-indexed map JSON. Without it the multi-tileset composite cannot be reduced and placed.
- `@reldens/utils` - provides `Logger` (mandated over the console), the `sc` shortcut helpers used pervasively, and `SchemaValidator` used by the loaders to validate the composite data against `MapCompositeDataSchema`.
- `@reldens/server-utils` - provides `FileHandler`, the single file-IO layer that reads the JSON inputs, creates the `generated`/`optimized` folders, copies the tilesheet, and writes the output map.
- `pathfinding` - provides `Grid` and `AStarFinder`, which drive path routing and connectivity validation between placed elements.

### Input asset files and their location

All inputs must sit in `examples/layer-elements-composite/`, because that folder is `rootFolder` (`__dirname`) and the optimizer and loader resolve every input relative to `rootFolder`:

- The data config `map-composite-data-with-associations.json`.
- The town composite `reldens-town-composite-with-associations.json` (named by `compositeElementsFile`).
- The interior composite `house-composite.json` (named by the `compositeFileNames` property on each house door layer, loaded as `rootFolder + name + '.json'`).
- The five surface tileset PNGs (`outside.png`, `terrain.png`, `house.png`, `doors.png`, `water.png`) and the interior tileset PNG (`inside.png`). The optimizer resolves each tileset image relative to `rootFolder`, so a missing or misplaced PNG breaks `optimizeMap()`.

### Node usage

There is no npm start or example script. Each example calls `execute()` at module load, so the example is run by invoking Node directly on the file. Install dependencies once with `npm install` in the package root, then run the script.

## How to run

Run from the package root `D:/dap/work/reldens/npm-packages/tile-map-generator`.

```bash
npm install
node examples/layer-elements-composite/generate-with-loader-multiples-with-associations.js
```

The manual equivalent:

```bash
node examples/layer-elements-composite/generate-multiples-with-associations.js
```

The working directory does not affect asset resolution because the example sets `rootFolder = __dirname`; output is created under that example folder at `examples/layer-elements-composite/generated/`.

## The procedure (step by step)

1. Run `generate-with-loader-multiples-with-associations.js`. It constructs `MultipleWithAssociationsByLoaderGenerator({loaderData: {rootFolder: __dirname, mapDataFile: 'map-composite-data-with-associations.json'}})` and calls `generate()`.

2. `MultipleWithAssociationsByLoaderGenerator.generate()` instantiates `LayerElementsCompositeLoader(loaderData)` and awaits `loader.load()`. The loader reads `map-composite-data-with-associations.json` via `FileHandler` (this JSON holds `factor`, `mainPathSize`, `blockMapBorder`, `collisionLayersForPaths`, the four-town `mapsInformation`, `associationsProperties`, and `compositeElementsFile`).

3. `LayerElementsCompositeLoader.loadPayload()` only reads `compositeElementsFile` (`reldens-town-composite-with-associations.json`) into `this.tileMapJSON`, and only when `tileMapJSON` was not already provided. The schema validation against `MapCompositeDataSchema`, the `mapData.rootFolder` assignment, and the `mapData.tileMapJSON` attachment (via `assignPayload`) all happen in the base `LayerElementsLoader.load()` flow, not in `loadPayload()`.

4. `MultipleWithAssociationsByLoaderGenerator.generate()` reads `loader.mapData.mapsInformation` and begins the per-town loop over `town-001`..`town-004`.

5. For each town, it computes `previousMainPath` (reusing the prior town's `generatedMainPathIndexes` only when that prior town's `hasAssociatedMap` is `false`, otherwise `[]`), creates a fresh `RandomMapGenerator`, clones `loader.mapData`, sets `mapData.mapName` and `mapData.previousMainPath`, applies the title with `addMapProperty('mapTitle', 'string', mapTitle)`, and awaits `generator.fromElementsProvider(mapData)`. Each generator mutates its incoming `tileMapJSON`, which is why a deep clone is used per iteration.

6. SURFACE preparation: `RandomMapGenerator.fromElementsProvider` constructs `ElementsProvider` and awaits `splitElements()`. `ElementsProvider.optimizeMap()` runs `TileMapOptimizer` on the town composite (storing `this.optimizedMap`), then `fetchPathTiles()` scans the optimized tileset tile properties to derive `pathTile`, `groundTile`/`groundTiles`, `bordersTiles`, `groundSpots`, and the surrounding/corner tiles via `PropertiesMapper`.

7. `ElementsProvider.splitByLayerName()` groups layers by element name (for example `house-01`, `house-02`, `house-03`, trees), skips the special layers, and reads per-element `quantity`/`freeSpaceAround`/`allowPathsInFreeSpace`/`mapCentered`. Each element group is cropped to its minimum bounding box and stored.

8. `MapDataMapper.fromProvider(...)` assembles the full generation options (map name, file name, tilesheet geometry, cropped `layerElements`, `elementsQuantity`, tile keys). `RandomMapGenerator.resetInstance(...)` then runs with the real options: it parses options through `setOptions`, validates with `OptionsValidator`, and re-wires every sub-instance with its concrete collaborators in dependency order.

9. SURFACE generation: `RandomMapGenerator.generate()` runs `spotGenerator.generateSpots(...)` first (spots may inject elements that change the map size), builds the empty grid with `MapGridBuilder`, populates the collision map border when `blockMapBorder` is true, and initializes the main path. `town-001` (empty `previousMainPath`) gets a random main path; later towns that consume a previous path get an opposite main path mirrored to the opposite edge, which also sets `hasAssociatedMap = true`.

10. Element placement: `elementsPlacer.placeElements()` first calls `generateAdditionalLayers()`, which creates one empty (all-zero) template layer per element sub-layer under its plain authoring name (for example `house-01-collisions`, `house-01-change-points`, `house-01-return-point`, `house-01-over-player`). The authoring `house-01-path` layer is NOT among them: `ElementsProvider.splitElements()` force-renames any element layer whose name contains `path` to `path`, so the house approach path is merged into the shared `path` layer before placement. Each instance is then placed via `PositionFinder`, and `ElementLayerWriter.updateLayerData` writes the placed tiles into PER-INSTANCE layers whose name fuses the instance number into the element key (`ElementLayerName.build`): instance `0` of `house-01` writes into `house-010-collisions`, `house-010-change-points`, `house-010-return-point`, `house-010-over-player`. The empty un-fused template layers stay all-zero and are filtered out at the end of `placeElements()`.

11. INTERIOR TRIGGER recording: while writing each element, `ElementLayerWriter.updateLayerChangePointsData` detects any layer whose name contains `change-points` (one per house) and records an entry into `generator.generatedChangePoints` via `ReturnPointWriter.recordChangePoint`, keyed for example `town-001-house-01-n0` (`mapPrefix` plus the cleaned element name plus `-n` plus the 0-based `elementNumber`), storing `{elementData, targetLayerName, tileIndex, mapIndex, elementNumber, x, y}` where `elementData` is the source change-points element data and `targetLayerName` is the FUSED written layer name (`house-010-change-points` for instance `0` of `house-01`). The matching `*-return-point` layers are recorded by `updateLayerWithReturnPointsData`, reading the outside re-emerge `position`. This `generatedChangePoints` dictionary is the PRIMARY link interior generation later consumes: it enumerates which change points exist and supplies each one's `targetLayerName` (the written change-points layer name) and `elementNumber`. The door properties themselves (`compositeFileNames`, `entryPosition`, `upperFloors`, etc.) are NOT stored here; interior generation re-reads them from the change-points layer in the generated surface map JSON.

12. SURFACE finish and write: `executePathsConnection()` routes A* paths (honoring `collisionLayersForPaths`, which includes `change-points`), `applyVariations()` scatters ground variations, `mapLayersComposer.generateLayersList()` composes and merges the final layers, `createTiledMapObject(...)` builds the Tiled JSON, the optimized tilesheet PNG is copied next to the output, and `FileHandler.writeFile(...)` writes the surface town map to `generated/<mapName>.json` (for example `generated/town-001.json`). The generated surface map is stored back into the loader generator.

13. INTERIOR generation: AFTER the surface map is fully written, `MultipleWithAssociationsByLoaderGenerator.generate()` constructs `AssociatedMaps` and calls `associatedMaps.generate(generatedMap, mapName, rootFolder, associationsProperties, generator)`. `AssociatedMaps.generate()` first validates its inputs and short-circuits, returning `false` before any sub-map is generated when the merged `associationsProperties` carries `dryRun`.

14. `AssociatedMaps.generate()` deep-clones `mainMapGenerator.generatedChangePoints` (the house entries from step 11) and iterates each. For each change point it re-finds the WRITTEN change-points layer in the generated surface map JSON by the recorded `targetLayerName` (the fused per-instance name, for example `house-010-change-points`; it falls back to `elementData.name` when `targetLayerName` is absent), reads all of that layer's properties via `fetchPropertiesFromLayer`, and skips the entry when there is no `compositeFileNames` property.

15. `loadTileMapJSON` reads the interior composite named by `compositeFileNames` (for example `house-composite.json`; a comma-separated list is chosen at random) as `rootFolder + name + '.json'`. `generateSubMapName` builds the sub-map name as `mapName + '-' + fusedGroupName + '-n' + elementNumber`, where `fusedGroupName` comes from the WRITTEN (fused) layer name, and `elementNumber` is the 0-based placement index; instance `0` of `house-01` produces the base interior `town-001-house-010-n0` (note the fused `house-010`, not the authoring `house-01` used by the change-point key).

16. `AssociatedMaps` builds the interior options by merging the town's resolved `mappedMapDataFromProvider`, the `associationsProperties` block, the loaded house `tileMapJSON`, the sub-map name and `rootFolder`, all the door layer's properties, and a forced reset of `{generatedChangePoints: {}, previousMainPath: [], mainPathSize: 0}`. It then runs `generator.fromAssociation(...)`, which delegates to `fromElementsProvider`, so the ENTIRE optimize/split/map/resetInstance pipeline (steps 6-8) re-runs on the house composite. The interior is an independent generation, not a slice of the surface map. `elementsQuantity['stairs-up']` and `['stairs-down']` are each set to the constant `1` whenever `upperFloors`/`downFloors` are greater than `0` (not derived from their numeric values). `entryPosition` and `entryPositionSize` are read from the door (change-points) layer properties, while `entryPositionFrom` is set to the source town's `mapName`, recording which town the player came from.

17. The interior is generated and written by the same `RandomMapGenerator.generate()` pipeline to `generated/<mapName>-<house>-n<N>.json` (for example `generated/town-001-house-010-n0.json`). Its own `change-points`/`return-point` layers (the house's stairs and its exit-back-to-town return point) are recorded the same way.

18. MULTI-FLOOR recursion: when `upperFloors`/`downFloors` are greater than 0, `AssociatedMaps.generateFloors` recurses, creating one more `RandomMapGenerator` per floor with the map name suffixed (for example `town-001-house-010-n0-upperFloor-n1` or `town-001-house-030-n0-downFloor-n1`), toggling the `stairs-up`/`stairs-down` quantities and passing `previousFloorData` so `ElementsPlacer.prePlaceStairs` aligns each new floor's stairs onto the prior floor's stairs. Each floor writes its own JSON.

19. The change-point loop continues for the remaining houses (more interiors), then the outer town loop advances.

20. TOWN CHAINING: the next town's `previousMainPath` is taken from this town's `generatedMainPathIndexes` only when this town's `hasAssociatedMap` is `false`. Because the opposite-path generation sets `hasAssociatedMap = true` whenever a town consumes a previous path, the chaining alternates random/opposite across `town-001` to `town-004`, joining adjacent surface town maps at opposite edges so the overworld connects.

## Configuration reference

Options reach the code through `fromElementsProvider(props)` then `MapDataMapper.fromProvider` then `resetInstance` then `setOptions`, where each value is read with `sc.get(options, 'name', default)`. The `associationsProperties` block is merged into each interior/floor generator's options through `AssociatedMaps.generate` then `fromAssociation`, so its keys are read by the SAME setters but only affect the associated (interior) maps. A few options (`factor`, `freeTilesMultiplier`, `expandElementsSize`, `minimumDistanceFromBorders`) are additionally read independently by `ElementsProvider` from the same props.

### Town map options

- `factor`
  - Tile-density/optimization scale factor passed to the optimizer; controls element splitting/optimization scaling and post-generation cleanup. Also read independently by `ElementsProvider`.
  - DEFAULT: `1` (example value `2`).
- `mainPathSize`
  - Width/size of the generated main path; `0` disables generating a random main path.
  - DEFAULT: `0` (example value `3`).
- `blockMapBorder`
  - When true, blocks and encloses the outer map border (adds 1 to width/height and marks the border non-walkable).
  - DEFAULT: `false` (example value `true`).
- `freeSpaceTilesQuantity`
  - Number of free/buffer tiles reserved around elements when computing map size; combined with `freeTilesMultiplier`.
  - DEFAULT: `0` (example value `2`).
- `freeTilesMultiplier`
  - Multiplier applied to `freeSpaceTilesQuantity` when sizing the map. Also read independently by `ElementsProvider`.
  - DEFAULT: `1` (example value `2`).
- `minimumElementsFreeSpaceAround`
  - Minimum guaranteed empty tiles around each placed element.
  - DEFAULT: `0` (example value `1`).
- `minimumDistanceFromBorders`
  - Minimum tiles kept between placed elements and the map borders; also adds (value times 2) to map width/height. Also read independently by `ElementsProvider`.
  - DEFAULT: `1`.
- `variableTilesPercentage`
  - Percentage of ground/path tiles that receive random ground variation tiles.
  - DEFAULT: `0` (example value `15`).
- `collisionLayersForPaths`
  - List of layer names treated as collisions/obstacles when building the pathfinding grid so paths route around them. The value `['change-points', 'collisions', 'tree-base']` is the loader data config example value.
  - DEFAULT: `[]`.
- `previousMainPath`
  - The previous map's generated main-path indexes, used to generate an opposite/aligned main path so adjacent town maps connect. Set per iteration only when the previous map has no associated map.
  - DEFAULT: `[]`.
- `expandElementsSize`
  - Number of tiles to pad/expand each cropped element layer outward. NOT read by `RandomMapGenerator.setOptions`; read only by `ElementsProvider`. Appears only in the manual script.
  - DEFAULT: `0` (manual-script example value `1`).
- `mapName`
  - Name/id of the map being generated; also derives the generated JSON file name. Set per map from `mapsInformation` entries.
  - DEFAULT: `this.defaultMapName`.
- `mapTitle`
  - Human-readable title. NOT read with `sc.get`; injected as a custom Tiled map property via `addMapProperty('mapTitle', 'string', ...)` and later re-read by `AssociatedMaps.fetchSubMapTitle` to build sub-map and floor titles.
  - DEFAULT: none (taken from each `mapsInformation` entry).
- `mapsInformation`
  - Array of `{mapName, mapTitle}` objects; one town map is generated per entry. Required (validated non-empty).
  - DEFAULT: none (required); example has four entries `town-001`..`town-004`.
- `compositeElementsFile`
  - File name of the town composite Tiled map JSON containing all element layers; loaded into `tileMapJSON`.
  - DEFAULT: `false` (example value `reldens-town-composite-with-associations.json`).
- `tileMapJSON`
  - In-memory composite map object, an alternative to `compositeElementsFile`. In the manual script it is provided directly as a deep copy.
  - DEFAULT: `null` in `ElementsProvider` (`sc.get(props, 'tileMapJSON', null)`) and `false` in `LayerElementsCompositeLoader`. NOT read by `RandomMapGenerator.setOptions`; only the pipeline's `ElementsProvider` and the composite loader consume it.
- `rootFolder`
  - Base folder for reading the composite/tilesheets and writing output; `generatedFolder` defaults to `rootFolder/generated`. In the loader it comes from `loaderData.rootFolder`.
  - DEFAULT: `__dirname`.
- `mapDataFile` (inside `loaderData`)
  - File name of the composite DATA config itself. Required; load fails if missing.
  - DEFAULT: none (required); example value `map-composite-data-with-associations.json`.

### associationsProperties (interior maps)

These keys are merged into each interior/floor generator's options. `AssociatedMaps` forces `mainPathSize: 0`, `previousMainPath: []`, and `generatedChangePoints: {}` for every interior regardless of config.

- `generateElementsPath`
  - Whether to generate connecting paths between elements on the interior map.
  - DEFAULT: `true` (example value `false`).
- `blockMapBorder`
  - Same option as the top-level one; blocks/encloses the interior map border.
  - DEFAULT: `false` (example value `true`).
- `freeSpaceTilesQuantity`
  - Same option; free buffer tiles around elements for interior sizing.
  - DEFAULT: `0` (example value `1`).
- `minimumElementsFreeSpaceAround`
  - Same option; minimum empty tiles around interior elements.
  - DEFAULT: `0` (example value `0`).
- `minimumDistanceFromBorders`
  - Same option; minimum tiles between interior elements and borders, and adds (value times 2) to interior size. Setting `0` keeps interiors tightly sized.
  - DEFAULT: `1` (example value `0`).
- `variableTilesPercentage`
  - Same option; percent of ground-variation tiles on the interior map.
  - DEFAULT: `0` (example value `0`).
- `placeElementsOrder`
  - Element placement strategy; `inOrder` places each element in the first available position, `random` scatters them.
  - DEFAULT: `random` (example value `inOrder`).
- `orderElementsBySize`
  - When true, elements are placed sorted by size (largest first).
  - DEFAULT: `true` (example value `false`).
- `randomizeQuantities`
  - When true, shuffles the flattened element list before placement; intended to be false when `orderElementsBySize` is true.
  - DEFAULT: `false` (example value `true`).
- `applySurroundingPathTiles`
  - Whether to apply surrounding/transition path tiles (borders) around generated paths.
  - DEFAULT: `true` (example value `false`).

## Authoring a town composite in Tiled

A town-with-inner-houses authoring job is one OUTSIDE/town composite map plus one or more INSIDE composite maps (for example `house-composite.json`). The generator splits the town map back into placeable elements, so layer naming and tile custom properties are the authoring contract.

### Element-layer naming convention

`ElementsProvider.splitByLayerName()` splits each `layer.name` on `-`. A non-special element layer MUST have at least three dash-separated parts, otherwise it is rejected with `Invalid layer name ... Expected: [elementName]-[index]-[layerName]`. The element GROUP key is always `parts[0] + '-' + parts[1]` (via `MapNaming.fuseGroupName`), and `parts[2..]` are the role/layer-type suffix. So `house-01-change-points` groups as `house-01`, and `tree-02-base` groups as `tree-02`. Plan naming so the first two dash segments are the intended group; a name like `bed-side-01-...` groups as `bed-side`, not `bed-side-01`.

Role suffixes seen in the town file include `base`, `collisions`, `collisions-over-player`, `over-player`, `shadow`, `path`, `change-points`, and `return-point`. Interiors additionally use `background`, `background-collisions`, and a `variation-NN` segment that sits AFTER the index (for example `bed-side-01-variation-03-collisions`, still grouping as `bed-side`).

Note that the data-bearing per-instance layers WRITTEN at generation time are not these plain authoring names: `ElementLayerName.build` fuses the placement instance number into the element key (documented convention: element `tree` plus layer `tree-collisions` plus instance `0` becomes `tree0-collisions`; so `house-01` instance `0` becomes `house-010-change-points`). The plain authoring names are only the editor-side template names.

Important name-handling rules:

- Any element layer whose name CONTAINS the substring `path` anywhere is force-renamed to `path` and merged into the shared path layer. Avoid `path` in unrelated role names, or that layer collapses into the path.
- `change-points`, `return-point`, and `collisions` are NOT special layer names; they are ordinary role suffixes and still require the full three-part `{name}-{index}-{role}` form.
- A layer whose name contains BOTH `spot-layer-` and `ground-variations-` is parsed as element variation tiles (the tiles key is the name with both substrings stripped).

Per-element properties are read by `ElementsProvider` from any one of the element's layers and attached to the GROUP: `quantity` (int, controls how many are scattered), `freeSpaceAround`, `allowPathsInFreeSpace`, and `mapCentered`. Put `quantity` on a single layer of the element (typically `-base`), duplicating it on multiple layers just overwrites. This "read from any layer" rule applies ONLY to these `ElementsProvider` group properties; the door/association properties are handled differently (see the linking section).

### Reserved/special layer names

`specialLayers = ['ground', 'path', 'ground-variations', 'borders', 'tileset-ref']`. These are skipped from element grouping and must not contain element tiles:

- `ground` - base ground fill.
- `path` - the main path network.
- `ground-variations` - its non-zero tiles become the random ground variation tiles.
- `borders` - the map border tiles.
- `tileset-ref` - reserved reference layer.

Separately, `ElementsFromLayersLoader.skipLayerNames = ['ground', 'ground-variations', 'borders', 'change-points']`, and `collisionLayersForPaths` defaults conceptually to layers like `change-points`, `collisions`, and `tree-base`, meaning tiles in `*-collisions` and `*-change-points` block A* pathfinding.

### Tileset tile custom properties

Tile properties are read by `ElementsProvider.fetchPathTiles()` from the single optimized tileset, but because the optimizer first merges ALL source tilesets into one, the `key`/`groundSpots` properties may be authored on tiles in ANY source tileset. The supported `key` string values are:

- `pathTile` - the path tile.
- `groundTile` - the base ground tile; additional `groundTile` tiles accumulate into a ground-variation pool.
- `border-<suffix>` - hard border tiles (for example `border-top`, `border-bottom-right`, `border-left`).
- `corner-<side>` - corner tiles (`corner-top-left`, `corner-top-right`, `corner-bottom-left`, `corner-bottom-right`).
- The nine surrounding values `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` - mapped to surrounding tiles for path/spot variations.
- Spot-prefixed surrounding/corner keys - if the value splits into three parts (surrounding) or four parts (corner), `parts[0]` is treated as a spot key and a separate `PropertiesMapper` is built for it (for example `respawnPunchTrees-top-left` or `respawnPunchTrees-corner-top-left`).

The `groundSpots` property is a comma-separated list of spot keys; each maps that tile id as the spot anchor.

For house interiors, the inside tileset also defines `wall-*` keys each paired with a `variation` int (1 or 2): `wall-top-left`, `wall-top`, `wall-top-right`, `wall-middle-left`, `wall-center`, `wall-middle-right`, `wall-bottom-left`, `wall-bottom-center`, `wall-down-right`. These drive interior wall placement and are distinct from path borders.

Wangsets are standard Tiled corner-type wangsets authored over the path/ground transition tiles and consumed by the package's wangset/walls mappers; `fetchPathTiles` does not read them. Note that `terrain`/`outside`/`house`/`doors`/`water`/`inside` are tileset NAMES (image file basenames), not Tiled `terrains[]` arrays. The `reldens-town-composite-with-associations.json` and `house-composite.json` files contain NO wangsets and NO `groundSpots`; those features are demonstrated in the sibling `reldens-town-composite.json` (a `corner`-type wangset named `path`, and a tile carrying both `groundSpots: "respawnPunchTrees"` and `key: "groundTile"`).

### Linking a house to its interior (the association/door mechanism)

An element instance becomes a portal to an inside map ONLY if it has a `{elementName}-{index}-change-points` layer whose layer properties include a `compositeFileNames` string. `AssociatedMaps.generate` skips any change-point that lacks it. `compositeFileNames` is the inside composite file name WITHOUT the `.json` extension; a comma-separated list is allowed and one entry is chosen at random, then resolved as `rootFolder + name + '.json'`.

Pair the door layer with a `{elementName}-{index}-return-point` layer (one tile) carrying a `position` string property (for example `down` or `up`) that marks where the player re-emerges outside; `position` defaults to `down` when omitted.

The door/association properties are read by `AssociatedMaps` SPECIFICALLY from the written change-points layer matched by the recorded `targetLayerName` (the fused per-instance `-change-points` layer, which carries the authoring layer's properties), not from any one of the element's layers. In `reldens-town-composite-with-associations.json` the same door property set is also duplicated onto other layers of the same house (for example `house-03-shadow` carries the full set, with `elementTitle: "House"`), but those duplicates are INERT because `AssociatedMaps` only reads them from the `-change-points` layer.

Observed door property sets in the town composite:

- `house-01-change-points`: `blockMapBorder=true`, `compositeFileNames="house-composite"`, `elementTitle="House 1"`, `entryPosition="down-left"`, `entryPositionSize=2`, `upperFloors=1`.
- `house-03-change-points`: `blockMapBorder`, `compositeFileNames="house-composite"`, `downFloorCompositeFileNames="house-composite"`, `downFloors=1`, `elementTitle="House 3"`, `entryPosition="down-right"`, `entryPositionSize=2`, `upperFloorCompositeFileNames="house-composite"`, `upperFloors=1`.
- `house-01-return-point`: a single non-zero tile with `position="down"`.

The door properties ride along on the recorded change-point: `elementTitle` builds the sub-map title (`mapTitle + ' - ' + elementTitle + '-' + elementNumber`), `entryPosition`/`entryPositionSize` define where the player enters the interior, and `blockMapBorder` encloses the interior.

For multi-floor dungeons, add `upperFloors`/`downFloors` (int) on the door layer to trigger `generateFloors`, and `upperFloorCompositeFileNames`/`downFloorCompositeFileNames` to name the per-direction floor composites. The inside composite must supply the stairs elements with their own `change-points` and `return-point` layers (for example `stairs-up-base`, `stairs-up-collisions`, `stairs-up-change-points`, `stairs-up-return-point`, plus `stairs-down-*` and `side-stairs-down-*`). In the shipped `house-composite.json` both `stairs-up-return-point` and `stairs-down-return-point` carry `position: "down"` (the value defaults to `down` when omitted, per `ElementLayerWriter.provideReturnPositionKeyFromLayer`). The inside composite also needs a top-level map property `position` (defaults to `down` if missing). The `upperFloors`/`downFloors` ints on the OUTSIDE door drive how many floor composites are generated from these stair change-points.

A house may also include a `{name}-{index}-path` layer to carve an approach path; it merges into the shared `path` layer.

## Output

The default output root is `generatedFolder = rootFolder/generated`, created via `FileHandler.createFolder`.

- SURFACE town maps are written by `RandomMapGenerator.generate()` to `generatedFolder/<mapName>.json` (for example `generated/town-001.json` through `generated/town-004.json`), driven by `reldens-town-composite-with-associations.json`. The optimized tilesheet PNG is copied next to the JSON.
- INTERIOR/associated house maps are written by `AssociatedMaps.generate()` (and by `generateFloors`), each calling the same `RandomMapGenerator.generate()`, to `generatedFolder/<mapName>-<house>-n<N>.json` (for example `generated/town-001-house-010-n0.json`), driven by `house-composite.json`. Multi-floor variants add `-upperFloor-nX` / `-downFloor-nX` suffixes.
- During processing both kinds emit intermediate optimized files under the `OPTIMIZED_SUB_FOLDER` (`generated/optimized`), created by `ElementsProvider.optimizeMap`. By default `removeOptimizedMapFilesAfterGeneration` is true, so `FileOperations.cleanAutoGeneratedProcessMapFiles` deletes the `optimized-*-elements` intermediates and removes the `generated/optimized` folder if it ends up empty. Pass `removeOptimizedMapFilesAfterGeneration: false` to retain `generated/optimized/` for inspection.
- For single-map town examples that do not pass `mapName`, the output name defaults to `random-map-<timestamp>.json` plus its copied `.png`, so output is non-deterministic across runs. The associations example uses the explicit `mapsInformation` names, so its surface and interior file names are stable.

Debug files (`test-*.json`) are written into `generatedFolder` only when `debugPathsGrid` or `shouldDebugAdjacentSpots` are enabled; the town examples leave both off, so none are produced.
