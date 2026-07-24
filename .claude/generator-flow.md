# Tile Map Generator — Complete Flow Reference

---

## Overview

The system has four stages:

0. **Admin UI** — User configures tilesets and spots in the browser, triggers file generation, then navigates to the Maps Wizard
1. **`tileset-to-tilemap`** — Server endpoint: receives the UI state, produces `composite.json` + `map-generator-config.json` + element PNGs
2. **`tile-map-optimizer`** — Strips unused tiles from composite, produces optimized PNG + JSON
3. **`tile-map-generator`** — Reads config + optimized composite → generates the final Tiled map JSON

---

## Stage 0: Admin UI → Generate → Maps Wizard

### Tileset Editor: `TilesetGenerator` — `src/theme/admin/js/tileset-to-tilemap/tileset-generator.js`

`TilesetGenerator.generate()` serializes the current in-browser tileset state and POSTs it to the server's generate endpoint.

**`serializeTileset(tileset)`** — builds the POST body for one tileset:
- Copies all tileset fields (name, tileWidth, tileHeight, etc.)
- Copies `spots: tileset.spots || []` — the full array of spot objects configured by the user. Each spot object has: `name`, `spotTile` (tileset-local index or null if not set), `width`, `height`, `quantity`, `markPercentage`, `variableTilesPercentage`, `freeSpaceAround`, `walkable`, `isElement`, `allowPathsInFreeSpace`, `mapCentered`, `placeRandomPath`, `depth`, `splitBordersInLayers`, `borderInnerWalls`, `borderOuterWalls`, `borderOuterWallsIncreaseLayerSize`, `surroundingTiles` (position dict), `corners` (position dict)

**`runGenerate(tilesets, fullTilesets)`** — POSTs to `GenerateRoute` on the server. The server writes all output files and returns a list of generated file entries. After a successful generate, the "Maps Wizard" button becomes visible if a session ID is present.

### Generate Endpoint: `GenerateRoute` — `tileset-to-tilemap/lib/routes/generate.js`

`GenerateRoute.handle(req, res)` reads:
- `req.body.tilesets` — serialized tileset array (includes `spots[]` per tileset)
- `req.body.fullTilesets` — full tileset data with image buffers
- `req.body.sessionId` — session identifier
- `req.body.mapName`, `req.body.mapTitle` — map naming
- `req.body.globalTileOptions` — optional global tile options

Delegates to `TilesetFilesBuilder.build(rootDir, sessionId, outputDir, tilesets, fullTilesets, mapName, mapTitle, globalTileOptions)`.

### Session Config API: `GET /tileset-analyzer/api/session-wizard-config` — `tileset-analyzer-subscriber.js:92`

When the Maps Wizard page opens with `?tilesetSessionId=X` in the URL, the client fetches this endpoint:
- Reads `map-generator-config.json` from `storageDir/output/{sessionId}/`
- Calls `MapsWizardConfigBuilder.buildPartialGeneratorData(config)` — `tileset-to-tilemap/lib/maps-wizard-config-builder.js:32`
- Returns `{ strategy, partialData }` where `partialData` contains:
  - `compositeElementsFile` — filename of the composite JSON
  - `automaticallyExtrudeMaps: 1`
  - Tile options extracted from `config.tileOptions`: `groundTile`, `pathTile`, `borderTile`, `randomGroundTiles`, `surroundingTiles`, `corners`, `bordersTiles`, `borderCornersTiles`
  - `groundSpots` — the full ground spots config object (`{ spot_001: { layerName, tilesKey, width, height, spotTile: 0, ... } }`)

### Maps Wizard Client: `maps-wizard-bindings.js` + `maps-wizard-utils.js`

When the Maps Wizard page loads with `prefillSessionId` in the URL:

1. The strategy radio button is clicked → fires `change` event → `updateGeneratorDataFromInputs()` runs synchronously (at this point `extraProperties = {}`, so the textarea gets JSON without `groundSpots` yet)
2. The async fetch returns → `setExtraProperties(wizardConfig.partialData, wizardConfig.strategy)` — captures any `partialData` property that has no matching `.config-input[data-property="..."]` element into the module-level `extraProperties` object. Because `compositeElementsFile` and `groundSpots` have no form inputs, they are captured into `extraProperties`.
3. `fillInputsFromData(wizardConfig.partialData, wizardConfig.strategy)` — fills form inputs for properties that DO have matching `.config-input` elements (e.g. `mapSize`, `blockMapBorder`, etc.)
4. `updateGeneratorDataFromInputs()` → `buildGeneratorData(optionType)` → starts with `Object.assign({}, extraProperties)` (seeding from `compositeElementsFile` + `groundSpots`) then reads all `.config-input` elements for the selected strategy → serializes to `#generatorData` textarea

**`setExtraProperties(data, optionType)`** — `maps-wizard-utils.js:66`:
Iterates all keys in `data`. For each key, queries for a `.config-input[data-option="common"][data-property="{key}"]` and a `.config-input[data-option="{optionType}"][data-property="{key}"]`. If neither exists, writes `extraProperties[key] = data[key]`. Resets `extraProperties` to `{}` on each call.

**`buildGeneratorData(optionType)`** — `maps-wizard-utils.js:83`:
Returns `Object.assign({}, extraProperties, ...commonInputs, ...optionInputs)`. The spread from `extraProperties` seeds all properties with no matching form input (including `groundSpots`, `compositeElementsFile`, `generatorType`, `mapsInformation`, `tileOptions`). Form inputs then overlay their values.

**`updateInputsFromGeneratorData()`** — `maps-wizard-utils.js:127`:
Called when the user manually edits the `#generatorData` textarea. Parses the current textarea JSON, calls `setExtraProperties(jsonData, optionType)` to rebuild `extraProperties` from the textarea content, then fills form inputs. This keeps `extraProperties` consistent with whatever is in the textarea.

### Maps Wizard Submit: `MapsWizardSubscriber` — `src/lib/admin/server/subscribers/maps-wizard-subscriber.js`

On POST `/maps-wizard` with `mainAction = 'generate'`:
1. `generatorData = req.body.generatorData` — the JSON string from the `#generatorData` textarea
2. `mapData = sc.toJson(generatorData)` — parsed object; includes `groundSpots`, `compositeElementsFile`, all form input values
3. `handlerParams = { mapData, rootFolder }` where `rootFolder` is `tilesetSessionsDir/output/{safeSessionId}` when a session is active
4. `runner.run('elements-composite-loader', handlerParams)` → see Stage 3 below

---

## Stage 0b: Client-Side Tileset State Management

This section documents how the in-browser tileset state is created, stored, and mutated — all of which directly determines what the server receives when the user clicks Generate.

### In-Memory State Shape

Each tileset in `app.state[tilesetIndex]` is a plain object. `spots` is an array of spot objects:

```
tileset.spots[i] = {
  // display name; normalized to 'spot_001' server-side
  name: 'spot-001',
  type: 'spot',
  approved: false,
  bulkSelected: false,
  // tileset-local index (0-based) set by picking; null = not picked
  spotTile: null,
  spotTileVariations: [],
  // position → tileset-local index
  surroundingTiles: {},
  corners: {},
  bordersTiles: {}, borderCornersTiles: {},
  innerWallsTiles: {}, innerWallsCornerTiles: {},
  outerWallsTiles: {}, outerWallsCornerTiles: {},
  // spot dimensions on the map in tiles
  width: 5, height: 5,
  quantity: 1,
  walkable: true,
  markPercentage: 100,
  variableTilesPercentage: 0,
  isElement: false,
  // null means "not set"
  freeSpaceAround: null,
  allowPathsInFreeSpace: false,
  mapCentered: 0,
  placeRandomPath: false,
  depth: false,
  splitBordersInLayers: false,
  borderInnerWalls: false,
  borderOuterWalls: false,
  borderOuterWallsIncreaseLayerSize: 4
}
```

### New Spot Creation: `TilesetTileOptionsBinder.addSpot()` — `tileset-tile-options-binder.js:209`

When the user clicks "Add Spot":
1. `buildDefaultSpot('spot-NNN')` is called — returns the shape above with `width: 5, height: 5` defaults
2. The new spot is pushed to `tileset.spots`
3. `app.selectedSpot = { tilesetIndex, spotIndex }` — auto-selects the new spot
4. `app.editor.renderLegend(tilesetIndex)` — re-renders the legend panel with the new spot row

**`buildDefaultSpot(name)`** — `tileset-tile-options-binder.js:46`:
- Sets `width: 5, height: 5` — these defaults ensure the spot is always placeable for new spots
- Sets `spotTile: null` — user must pick a tile; without it the spot uses `groundTile` as fill
- Sets `freeSpaceAround: null` — computed to 1 when absent in `buildGroundSpotConfig()`

### Session Loading: `StateBuilder.buildTileset()` — `state-builder.js`

When loading a saved session from disk, `buildTileset(tilesetData)` sets:
```javascript
spots: tilesetData.spots || []
```
No normalization or default-filling of spot properties occurs. If the session was saved when `buildDefaultSpot()` did NOT set `width`/`height` defaults (old code), or if the user manually cleared those inputs, the loaded spot objects may have `width: null, height: null`. These null values propagate unchanged through all subsequent steps.

### Spot Props UI: `TilesetSpotEditor` — `spot-editor.js`

**`appendSpotRow(list, spot, si, tileset, tilesetIndex, spotTemplate)`** — `spot-editor.js:8`:
- Clones the `<template id="spot-template">` HTML fragment
- Calls `initSpotProps(frag, spot)` to bind all `[data-prop]` inputs to `spot` object
- Binds spot header click → toggle expand/collapse via `app.selectedSpot`
- Binds `nameInput.blur` → update `tileset.spots[si].name` and re-render legend
- Binds `deleteBtn.click` → splice spot from `tileset.spots[]`, re-render

**`initSpotProps(frag, spot)`** — `spot-editor.js:129` (after fix):
Iterates all `[data-prop]` elements. For each element:
- **checkbox** (`el.type === 'checkbox'`): sets `el.checked = spot[key] || false`, binds `change` listener
- **number** (`el.type === 'number'`): calls `initNumberSpotProp(el, key, spot)` (see below), binds `input` listener → `spot[key] = el.value === '' ? null : +el.value`
- **other**: if `spot[key] !== undefined`, sets `el.value = spot[key]`; binds `input` listener → `spot[key] = el.value`

**`initNumberSpotProp(el, key, spot)`** — `spot-editor.js:116` (added in fix):
- If `spot[key]` is not null/undefined: sets `el.value = spot[key]` (normal case)
- If `spot[key]` is null or undefined: reads `el.min`, converts to number; if min > 0, sets both `spot[key] = minVal` AND `el.value = minVal`
- This fixes old sessions where `spot.width = null` or `spot.height = null` — at render time the spot's null dimension is replaced with the input's `min` value (e.g. `1`), preventing null from flowing to the generator

**`bindSpotBulkCheckbox()` / `bindSpotLockBtn()`** — `spot-editor.js:62,75`:
Handle bulk selection and lock (approved) state. Lock state prevents the spot from being removed in bulk operations.

### Spot Prop Change Bindings: `TilesetSpotPropsBinder` — `tileset-spot-props-binder.js`

Separate from `spot-editor.js` — only adds `change` event listeners (NOT initial value reading). Handles:
- Number inputs: `spot[key] = prop.value === '' ? null : +prop.value`
- Checkbox inputs: `spot[key] = el.checked`
- Text inputs: `spot[key] = el.value`

**Important**: this binder only fires on user-initiated changes, NOT at initialization time. It does NOT fix null values at load time — that is done by `initNumberSpotProp()` in `spot-editor.js`.

### Spot Tile Pick: `TilesetTileOptionsPickHandler.handleSpotTilePick()` — `tileset-tile-options-pick-handler.js`

When the user clicks a tile in the tileset canvas while a spot-tile option button is active:
```javascript
spot.spotTile = flatIndex;
// where: flatIndex = row * tileset.tilesetColumns + col  (0-based within the tileset image)
```

This is the **tileset-local index** (0-based, within the specific tileset). NOT the composite GID. The composite GID is computed in `buildVariationLayers()` as `firstgid + flatIndex`, ensuring the tile appears in the `tileset-ref` layer and survives optimization.

### Spot Lock State: `approved` flag

When `spot.approved = true`, the spot row shows a lock icon and the spot is excluded from bulk delete operations. This flag is purely UI state — it is serialized into the session but has no effect on generation.

---

## Stage 1: UI → Composite JSON + Config JSON

**Entry point:** `TilesetFilesBuilder.build()` — `tileset-to-tilemap/lib/tileset-files-builder.js:259`

### Flow

```
TilesetFilesBuilder.build()
  // copies PNG, builds per-element JSON files, groups tilesets by tile size
  → buildTilesetFilesEntries()
  // produces composite.json + map-generator-config.json
  → buildCompositeEntries()
      // composite.json
      → CompositeBuilder.buildCompositeJSON()
      → TilesetCompositeConfigBuilder.buildConfigData() // map-generator-config.json
```

### `CompositeBuilder.buildCompositeJSON()` — `composite-builder.js:16`

Builds the Tiled map JSON that represents the "elements composite" — a single map containing all elements as separate layers, with tilesets listed and annotations/wangsets embedded.

Steps:
1. `CompositeAnnotationResolver.resolve()` — merges per-tileset `tileOptions` and `globalTileOptions` into `effectivePerTileset[]`
2. `preprocessTilesets()` — builds `tilesetEntries[]`, collects all elements into flat `elements[]`, tracks `tilesetFirstgids[]`
3. `annotationResolver.resolvePathTileCompositeId()` — finds path tile's composite GID (`firstgid + opts.pathTile`)
4. `packElements()` — bin-packs elements onto a canvas, returns `placements[]` + canvas size
5. `buildLayers()` — for each placement builds one layer per element layer; path layers get all tiles replaced with `pathTileCompositeId`; first layer gets `quantity`/`freeSpaceAround`/`allowPathsInFreeSpace` properties
6. `buildVariationLayers()` — appends: `ground-variations` layer (random ground tile IDs listed sequentially), `tileset-ref` layer (annotated tile IDs), spot variation layers (`spot-layer-ground-variations-{spotKey}`)
7. Returns full Tiled map object

### Per-instance output layer naming - `ElementLayerName` (`lib/utilities/element-layer-name.js`)

The composite/source convention above (`{name}-{index}-{layerType}`, split by `-`) describes the INPUT element layers. When the generator PLACES elements, each placed copy gets its own layer so overlapping copies of the same element never overwrite each other's tiles.

The instance number is FUSED to the element key (no extra `-` segment, since `-` is the structural delimiter):

- `ElementLayerName.build(elementType, instanceNumber, sourceLayerName)`: e.g. element `tree`, source layer `tree-collisions`, instance 0 => `tree0-collisions`. If the source layer name does not start with the element key it is appended whole (`collisions` => `tree0-collisions`), so output is always element-scoped (no cross-element collision) and convention-agnostic.
- `ElementLayerName.instanceIndex(elementType, layerName)`: inverse parse, strips the element key and reads the leading digits before the next `-` (`name.slice(elementType.length).match(/^([0-9]+)-/)`). Returns the instance index string or `null`.

Used by:
- `RandomMapGenerator.updateLayerData()`: builds the per-instance target layer (`additionalLayers` find-or-create).
- `PatternMatcher.countElementInstancesInMap()`: counts an element's instances by distinct instance indices.
- `ElementPositionAnalyzer.findElementPositionsInMap()`: groups an element's layers by instance index, one position per instance.

**Key method in `createTilesetEntry()` — `composite-builder.js:106`:**
- `CompositeTileAnnotationBuilder.buildTileAnnotations()` — adds `tiles[]` with `key` and `groundSpots` properties (see annotation rules below)
- `CompositeWangsetBuilder.buildSpotWangsets()` — adds `wangsets[]` for inner/outer walls (see wangset rules below)

### `TilesetCompositeConfigBuilder.buildConfigData()` — `tileset-composite-config-builder.js:123`

Produces `map-generator-config.json`. Key fields:
- `generatorType` — from first tileset or defaults to `COMPOSITE`
- `compositeElementsFile` — filename of the composite JSON
- `mapsInformation[]` — `{mapName, mapTitle}` per tileset
- `tileOptions` — merged from `TileOptionsMerger.merge()` using `firstgids`
- `groundSpots` — keyed by normalized spot name (`-` → `_`), built by `buildGroundSpotConfig()`

**`buildGroundSpotConfig()` — `tileset-composite-config-builder.js:59`:**
```
{
  layerName: normalizedKey,
  tilesKey: normalizedKey,
  width: (null !== rawWidth && 0 < rawWidth) ? rawWidth : 5,
  height: (null !== rawHeight && 0 < rawHeight) ? rawHeight : 5,
  quantity, freeSpaceAround, walkable,
  // server-side default: true (visible positioned layer)
  isElement: sc.get(spot, 'isElement', true),
  allowPathsInFreeSpace, variableTilesPercentage, markPercentage,
  applyCornersTiles: 0 < Object.keys(surroundingTiles).length,
  splitBordersInLayers, placeRandomPath,
  // server-side default: true (depth-ordered placement)
  depth: sc.get(spot, 'depth', true),
  mapCentered, borderInnerWalls, borderOuterWalls, borderOuterWallsIncreaseLayerSize
  // spotTile: firstgid + spotTile  ← present only when user picked a spot tile; omitted when null
}
```

`spotTile` is only written into the config when the user has picked a tile for the spot (`null !== spotTile` check). When present, the composite GID is computed as `firstgid + spotTile`, where `firstgid` is the tileset's starting GID in the composite. This produces the correct tile ID for the optimized composite pipeline. When absent, `sc.get(groundSpotConfig, 'spotTile', this.groundTile)` in the generator returns `this.groundTile` as fallback — the spot is filled with the same tile as the ground and visually blends into the terrain.

`width` and `height` are null-safe: if the value is null or `<= 0`, the fallback of `5` is used, matching the default from `buildDefaultSpot()`. `sc.get` uses `hasOwn` internally — a key set to `null` returns `null` (not the fallback), so the null check must be explicit.

`isElement` defaults to `true` on the server side when the property is absent from the spot data. `depth` also defaults to `true` on the server side. These server-side defaults ensure that spots configured without explicit `isElement`/`depth` values are treated as visible positioned layers placed above ground.

**`applyCornersTiles`** is derived from whether `surroundingTiles` is non-empty. If the user picked tiles in the 3×3 grid (excluding center), `applyCornersTiles = true` and border/corner processing runs. Without surroundingTiles, the spot is filled uniformly with the spot tile.

---

## Stage 2: Tile Map Optimization

**Entry:** `TileMapOptimizer.optimize()` — `tile-map-optimizer/lib/tile-map-optimizer.js:87`

### What it does

1. `parseJSON()` — scans ALL layer data arrays, collects every unique non-zero tile ID used across all layers into `mappedOldToNewTiles[]` (sorted, zero removed). Also collects animation frames and wangset tile IDs.
2. `createThumbsFromLayersData()` — for each tile in `mappedOldToNewTiles`, extracts the tile image from source tileset PNG, places it sequentially in a new packed PNG. Updates `newImagesPositions[oldGID] = newPosition` (1-based).
3. `createNewJSON()` — remaps all layer data values via `newImagesPositions[old] = new`. Remaps tile annotation `id` fields to `newImagesPosition - 1`. Copies `tile.properties` as-is (no remapping). Remaps wangset `tileid` values via `newImagesPositions[tileset.first + wangsetTile.tileid] - 1`.

### What survives optimization

A tile only survives if it appears in at least one layer's data array. Tiles that exist only in annotations (`tiles[]`) or wangsets but are never placed in any layer data are dropped — their `id` remapping produces a CRITICAL log and the annotation entry is removed from the optimized composite.

The spot tile must appear in the `tileset-ref` layer (added by `buildVariationLayers()`) to survive optimization and receive a valid new position. `buildVariationLayers()` in `composite-builder.js` explicitly adds a layer containing `firstgid + annotatedId` for every annotated tile, including spot tiles, to ensure they survive this step.

### Output

`optimizedMap = output.newJSONResized || output.newJSON`

The `newJSONResized` is used when `factor > 1` (pixel-doubled tileset). The optimized tileset has `firstgid = 1` always.

---

## Stage 3: Map Generation

**Entry:** `RandomMapGenerator.fromElementsProvider(props)` — `random-map-generator.js:194`

```
fromElementsProvider(props)
  → new ElementsProvider(props)
  → elementsProvider.splitElements()
      // runs TileMapOptimizer, calls fetchPathTiles()
      → optimizeMap()
      // splits composite layers into croppedElements groups
      → splitByLayerName()
  → MapDataMapper.fromProvider(props, mapName, elementsProvider)
  // initializes all generator state
  → resetInstance(mappedMapDataFromProvider)
```

### `ElementsProvider.optimizeMap()` — `elements-provider.js:221`

Runs `TileMapOptimizer` on the composite JSON, then calls `fetchPathTiles()`.

### `ElementsProvider.fetchPathTiles()` — `elements-provider.js:236`

Reads the optimized tileset's `tiles[]` annotations (already remapped to new IDs). Populates:

- `this.groundSpots[spotKey] = newTileId` — from `property.name === 'groundSpots'`
- `this.pathTile` — from `property.value === 'pathTile'`
- `this.groundTile` / `this.groundTiles[]` — from `property.value === 'groundTile'`
- `this.bordersTiles[direction]` — from `property.value` matching `'border-{direction}'`
- `this.groundSpotsPropertiesMappers[spotKey]` — created and populated for spot tile annotations

**Key parsing rule for `key` properties (lines 280–301):**
```
propertyValueSplit = property.value.split('-')
spotKey = propertyValueSplit[0]
isSurroundingTile = -1 === property.value.indexOf('corner-')

useSpotPropertyMapper:
  - isSurroundingTile AND 3 parts  → spot surrounding tile  (e.g. 'spot_001-middle-center')
  - NOT isSurroundingTile AND 4 parts → spot corner tile    (e.g. 'spot_001-corner-top-left')
  - 2 parts surrounding → global propertiesMapper          (e.g. 'middle-center')
  - 3 parts corner → global propertiesMapper               (e.g. 'corner-top-left')
  - 5+ parts → IGNORED (falls through silently)
```

When `useSpotPropertyMapper` is true:
- Creates `groundSpotsPropertiesMappers[spotKey] = new PropertiesMapper(spotKey)` if not existing
- Calls `mapSurroundingByKey(property.value, newTileId)` or `mapCornersByKey(cleanCornerKey, newTileId)`
- The PropertiesMapper stores raw position strings in `surroundingTiles{}` and `corners{}`

After the loop: `this.surroundingTiles = this.propertiesMapper.surroundingTiles` and `this.corners = this.propertiesMapper.corners` (for the global/path tiles mapper).

### `ElementsProvider.splitByLayerName()` — `elements-provider.js:121`

Iterates composite layers. Each layer name must have at least 3 parts separated by `-` (format: `{name}-{index}-{layerType}`). This is the step that cuts the composite canvas back into individual elements: every layer is assigned to a GROUP, and each group later becomes exactly ONE placeable element.

Group key resolution, `fetchElementLayerGroup(layerName, splitLayerName)` (`elements-provider.js:175`):

1. Names starting with `stairs-up-` or `stairs-down-` are pinned to the group keys `stairs-up` / `stairs-down` (these exact keys are hardcoded in `prePlaceStairs` and the associated maps floor logic).
2. Otherwise the key is `ElementLayerName.parse(layerName).instanceId`: the known layer-type suffix (`collisions-over-player`, `collisions`, `over-player`, `below-player`, `path`, `base`) is stripped and the remainder is `{elementName}-{index}`, so multi-segment names work (`house-clean-005-collisions` -> `house-clean-005`).
3. When the name does not end in a known layer type, fallback to `MapNaming.fuseGroupName` (first two name parts joined, e.g. `house-01-shadow` -> `house-01`).

All layers sharing a group key travel together from here on: `splitElements()` clones the map per group, keeps only that group's layers, crops them to the union bounding box of their tiles (`cropMapToMinimumArea`) and stores the result in `croppedElements[groupKey]`. That cropped stamp IS the element the placer will position: whatever the group contains is placed as one unit.

Special handling:

- `ground-variations` → populates `this.randomGroundTiles[]` from non-zero tile IDs in layer
- `spot-layer-{tilesKey}-ground-variations` → populates `this.elementsVariations[tilesKey][]`
- Reads layer `properties` per group: `quantity`, `freeSpaceAround`, `allowPathsInFreeSpace`, `mapCentered` (each read assigns the group entry, so the value on the group's property-carrying layer wins)

### `MapDataMapper.fromProvider()` — `data-mapper.js:13`

Merges provider data into props. **Key fields passed through:**
- `groundSpots` — comes from **original `props`** (the config JSON), NOT from `elementsProvider.groundSpots`
- `groundSpotsPropertiesMappers` — from `elementsProvider.groundSpotsPropertiesMappers`
- `optimizedMapFirstTileset` — `optimizedMap.tilesets[0]` (with wangsets, tiles, firstgid=1)
- `layerElements` — `elementsProvider.croppedElements`
- `groundTile`, `pathTile`, `randomGroundTiles`, `surroundingTiles`, `corners`, `bordersTiles` — from provider

### `RandomMapGenerator.resetInstance()` — `random-map-generator.js:41`

Sets all options via `setOptions()`. Critical initialization:
```javascript
this.propertiesMapper.map(this.surroundingTiles, this.corners);
this.tilesShortcuts = this.mapTilesShortcuts('path', this.pathTile, this.propertiesMapper);
```

---

## Stage 3a: Spot Generation

**Entry:** `SpotGenerator.generateSpots()` — `spot-generator.js:35`

Called first in `RandomMapGenerator.generate()` before map grid creation, because spots can become elements that affect map sizing.

### Per-spot flow

```
for each spotKey in this.groundSpots:
  // from config JSON (groundSpots from sc.deepJsonClone(props), NOT from elementsProvider.groundSpots)
  groundSpotConfig = this.groundSpots[spotKey]
  // usually same as spotKey, allows multiple spots to share tile annotations
  tilesKey = sc.get(groundSpotConfig, 'tilesKey', spotKey)
  // 0 when user set a tile (sMC→p mechanism resolves real ID below)
  // this.groundTile when spotTile key is absent from config (sc.get fallback)
  spotTile = sc.get(groundSpotConfig, 'spotTile', this.groundTile)

  if groundSpotsPropertiesMappers[tilesKey] exists:
    // populates surroundingTilesPosition + cornersPosition from raw tile positions
    groundSpotsPropertiesMappers[tilesKey].map()

  spotTilesShortcuts = mapTilesShortcuts(tilesKey, spotTile, propertiesMapper)
  // → TilesShortcuts.fromPropertiesMappersList()

  if spotTilesShortcuts.p is truthy AND spotTile !== spotTilesShortcuts.p:
    // REAL tile ID from optimized composite (via sMC→p mechanism)
    spotTile = spotTilesShortcuts.p

  // spotTile is now the actual composite GID to fill the spot with
  // createSpotLayerData(width, height, markPercentage, spotTile, applyCornersTiles)
```

**Spot types and layer placement:**

**Functional invisible layers** (`isElement: false`): The spot layers are stored in `groundSpotConfig.spotLayers`. `generateInvisibleSpots()` places them at a random position on the full map grid and pushes them into `staticLayers` before the ground layer is added, so they sit below all visible terrain. These spots serve as functional zones — respawn areas, event triggers, zone markers — where only the tile data matters for gameplay logic. The tiles used may be transparent or visually indistinct from the ground.

**Visible positioned layers** (`isElement: true`): `saveLayerElements()` stores them in `layerElements`. The map generator places them using the element placement system (respecting `freeSpaceAround`, `quantity`, `allowPathsInFreeSpace`, etc.). These spots become `additionalLayers`, which are merged after all `staticLayers`, placing them on top of the terrain. When `depth: true`, `reorderLayersBasedOnSpots` additionally moves the spot layer to index 1 in the final stack (directly above ground at index 0).

**`depth` and `isElement` interaction:** `depth: true` only takes effect when combined with `isElement: true`. The spot must first be in `layerElements` (via `saveLayerElements`) for `reorderLayersBasedOnSpots` to locate and reorder it. A spot with `depth: true` and `isElement: false` is excluded from both paths: `generateInvisibleSpots` filters out spots where `depth` is truthy, and `saveLayerElements` is only called when `isElement: true`. Such a spot is not placed in any layer.

### `mapTilesShortcuts()` — `random-map-generator.js:1567`

Calls `TilesShortcuts.fromPropertiesMappersList()`.

### `TilesShortcuts.fromPropertiesMappersList()` — `tiles-shortcuts.js:34`

```javascript
// If suffix is provided (e.g. '-inner-walls'):
if(suffix) {
    // e.g. 'spot_001-inner-walls'
    tilesKey = tilesKey + suffix;
    propertiesMapper = groundSpotsPropertiesMappers[tilesKey];
}

propertiesMapperShortCut = 'path' === tilesKey || !propertiesMapper ? '' : tilesKey+'-';

mappedData = {
    surroundingTilesPosition: propertiesMapper?.surroundingTilesPosition,
    cornersPosition: propertiesMapper?.cornersPosition
}

// Fall back to wangset if mapper is missing OR either position dict is empty:
if(!propertiesMapper
   || 0 === Object.keys(propertiesMapper.surroundingTilesPosition).length
   || 0 === Object.keys(propertiesMapper.cornersPosition).length)
{
    mappedData = TilesShortcuts.mapWangsetData(tilesKey, optimizedMapFirstTileset);
    // → WangsetMapper(fetchWangsetByName(tilesKey, optimizedMapFirstTileset))
}

instance = new TilesShortcuts(mappedData.mainTile || mainTile, mappedData.surroundingTilesPosition, ...)
```

### `TilesShortcuts` constructor — `tiles-shortcuts.js:13`

```javascript
this.sMC = surroundingTilesPosition[prefix+'middle-center'];
// ...all 9 surrounding + 4 corner shortcuts...
// THE sMC→p MECHANISM:
// When spotTile=0 AND sMC is set → p = sMC (the real center tile ID)
this.p = 0 === pathTile && 0 !== this.sMC ? this.sMC : pathTile;
```

**This is how `spotTile = 0` from config becomes the real optimized tile ID.**

### PropertiesMapper — `properties-mapper.js`

Created with `new PropertiesMapper(spotKey)`, prefix becomes `'{spotKey}-'`.

- `mapSurroundingByKey(key, value)` — maps full key (e.g. `'spot_001-middle-center'`) → stores in `surroundingTiles['-1,0']` etc.
- `mapCornersByKey(cleanCornerKey, value)` — maps `'top-left'` → stores in `corners['-1,-1']` etc.
- `map()` — converts `surroundingTiles` → `surroundingTilesPosition` and `corners` → `cornersPosition` (named keys like `'spot_001-top-left'`)

**`surroundingTilesPosition` keys have the mapper prefix:** e.g. `'spot_001-top-left'`, `'spot_001-middle-center'` etc.

**`cornersPosition` keys have the mapper prefix:** e.g. `'spot_001-top-left'`, `'spot_001-bottom-right'` etc.

In `TilesShortcuts` constructor, `propertiesMapperShortCut = tilesKey+'-'` (e.g. `'spot_001-'`), so:
```javascript
this.sMC = surroundingTilesPosition['spot_001-middle-center'];
this.cTL = cornersPosition['spot_001-top-left'];
```

---

## Stage 3b: Inner/Outer Walls

**Entry:** `SpotGenerator.generateSpots()` → when `groundSpotConfig.borderInnerWalls === true`

```javascript
wallsLayer = this.createLayerInnerWalls(bordersLayer, tilesKey, spotTilesShortcuts, width, height);
```

### `WallsGenerator.createLayerInnerWalls()` — `walls-generator.js:28`

```javascript
innerWallsTilesShortcuts = this.mapTilesShortcuts(tilesKey, spotTilesShortcuts.p, null, '-inner-walls');
// tilesKey + '-inner-walls' → e.g. 'spot_001-inner-walls'
// Looks for groundSpotsPropertiesMappers['spot_001-inner-walls'] → NOT found (no such mapper)
// Falls back to: WangsetMapper(fetchWangsetByName('spot_001-inner-walls', optimizedMapFirstTileset))
// Finds wangset named 'spot_001-inner-walls' in optimized tileset
```

Then `determineWallTiles(innerWallsTilesShortcuts, spotTilesShortcuts, currentTile)` — `walls-generator.js:206`:
```javascript
if(currentTile === spotTilesShortcuts.cTL)  → [innerWallsTilesShortcuts.sML, innerWallsTilesShortcuts.cTL]
if(currentTile === spotTilesShortcuts.sTC)  → [innerWallsTilesShortcuts.sMC, innerWallsTilesShortcuts.sTC]
if(currentTile === spotTilesShortcuts.cTR)  → [innerWallsTilesShortcuts.sMR, innerWallsTilesShortcuts.cTR]
```

**`innerWallsTilesShortcuts.cTL` requires the wangset for `'spot_001-inner-walls'` to have a tile with corner wangid `[0,1,0,1,0,1,0,0]`.**

### Wangset naming convention

Wangsets are created by `CompositeWangsetBuilder.buildSpotWangsets()` — `composite-wangset-builder.js:65`:
- `'{normalizedSpotKey}-inner-walls'` — from `spot.innerWallsTiles` dict
- `'{normalizedSpotKey}-outer-walls'` — from `spot.outerWallsTiles` dict

These wangset names are what `TilesShortcuts.fetchWangsetByName(tilesKey, ...)` searches for.

### `WangsetMapper` — `wangset-mapper.js`

Reads wangset tiles and maps wangids to position names.

**Surrounding wangids (9 tiles):**
```
top-left:      [0,0,0,1,0,0,0,0]
top-center:    [0,0,0,1,0,1,0,0]
top-right:     [0,0,0,0,0,1,0,0]
middle-left:   [0,1,0,1,0,0,0,0]
middle-center: [0,1,0,1,0,1,0,1]
middle-right:  [0,0,0,0,0,1,0,1]
bottom-left:   [0,1,0,0,0,0,0,0]
bottom-center: [0,1,0,0,0,0,0,1]
bottom-right:  [0,0,0,0,0,0,0,1]
```

**Corner wangids (4 tiles) — different bit pattern:**
```
top-left:     [0,1,0,1,0,1,0,0]
top-right:    [0,0,0,1,0,1,0,1]
bottom-left:  [0,1,0,1,0,0,0,1]
bottom-right: [0,1,0,0,0,1,0,1]
```

These populate `WangsetMapper.surroundingTilesPosition` and `WangsetMapper.cornersPosition`. Since `WangsetMapper` has no prefix, these keys are bare: `'top-left'`, `'middle-center'`, etc.

After `WangsetMapper` is used as `mappedData`, `TilesShortcuts` is constructed with `propertiesMapperShortCut = ''` (because `!propertiesMapper`), so shortcut assignments use bare keys:
```javascript
this.cTL = cornersPosition['top-left'];
this.sMC = surroundingTilesPosition['middle-center'];
```

### `WallsGenerator.createLayerOuterWalls()` — `walls-generator.js:54`

Similar: calls `mapTilesShortcuts(tilesKey, spotTiles.p, null, '-outer-walls')` → finds wangset `'spot_001-outer-walls'`. Uses `WallsMapper` to determine opposite tile placements, then applies multiple pattern sequences (`OuterWalls`, `OuterWallsMerge`, `Corners`).

---

## Stage 3c: Map Grid Generation

After spots, `RandomMapGenerator.generate()` — `random-map-generator.js:207`:

```
// spots first (can become elements)
generateSpots()
// creates mapGrid, groundLayerData
mapGridBuilder.generateEmptyMap()
// border tiles + entry positions
populateCollisionsMapBorder()
// generateAdditionalLayers(), place all layerElements
placeElements()
// runs PathFinder, applies borders/corners/walls to paths
executePathsConnection()
// applies randomGroundTiles to ground-variations layer
applyVariations()
// assembles all layers, reorders by depth, filters empty, merges
generateLayersList()
// wraps in Tiled map JSON
createTiledMapObject(layers)
// saves to generated/{mapName}.json
FileHandler.writeFile(...)
```

---

## Stage 3c2: Element Placement and Order

`ElementsPlacer.placeElements()` - `lib/generator/elements-placer.js`

1. `generateAdditionalLayers()` creates one empty map-sized layer per distinct element source layer name.
2. `prePlaceStairs()` places stairs-up/stairs-down at fixed positions from `previousFloorData` (associated floors) and removes them from `elementsQuantity`.
3. `feasibility.buildPending()` (`lib/generator/placement-feasibility.js`) builds the pending footprints queue: one entry per element instance, sized `width/height + freeSpaceAround * 2`. Spots registered as elements are included because they live in `elementsQuantity`.
4. `CenteredElementsPlacer.placeCenteredElements()` runs FIRST: elements with a non-zero `mapCentered` order are sorted ascending (stable sort, ties keep file order) and placed deterministically - order 1 at the exact map center, the rest in offset rings around it (`placementOffsets`, ring distance grows per failed round). Their quantities are zeroed so the main loop skips them.
5. Main loop: iterates `elementsQuantity` key order, or by descending area when `orderElementsBySize` is true. Position search per instance: `PositionFinder.findPosition` - `inOrder` scans top-left to bottom-right, `random` tries random positions.

### Strict feasibility safeguard

Every candidate position must keep ALL still-pending elements placeable. `PlacementFeasibility.buildValidator()`:

- Returns `null` when nothing is pending (no constraint, behavior identical to a build without the safeguard).
- Returns `false` (global fail) when some pending footprint has no free window on the CURRENT grid - no candidate can fix that, so the position search is skipped entirely and the resolver runs.
- Otherwise returns a validator called per candidate: a cheap free-area pre-check first, then, using a blocked-cells integral table built once per placement (`GeometryCalculator.buildBlockedIntegral` / `hasFreeWindow`), every distinct pending footprint (largest area first) must still have a free window that does not overlap the candidate rect.

The validator threads through `PositionFinder.canPlaceElement` and `CenteredElementsPlacer.canPlaceElementCentered`. It never changes ordering, only candidate validity.

### placeRejectResolver

When no candidate passes (or on global fail) the element is NEVER silently dropped: `PlacementRejectResolver.resolve()` (`lib/generator/placement-reject-resolver.js`) runs, controlled by the `placeRejectResolver` option (`moveElements` | `autoGrow`, default `autoGrow`, exposed in the Maps Wizard as "Elements place rejection resolve method").

Contract: `resolve(elementType, elementNumber)` PLACES the rejected element itself (through the normal `placeElementOnMap` path, so the journal and pending queue stay in sync) and returns a boolean; the caller must NOT place again on success. A re-entrant resolve call (a placement triggered while already resolving) goes straight to `autoGrow` so resolution always terminates.

- `moveElements`: removes the most recent movable placed element (journal tracked; elements with change-points or return-point layers and stairs are never moved), clears its tiles from its per-instance layers, requeues it, rebuilds the map grid from the journal (`MapGridBuilder.rebuildGridFromJournal`, replaying free-space marking through `ElementLayerWriter.markFreeSpaceAroundElementAsNotAvailable`), then retries the rejected element. Removed elements are re-placed by `processRequeuedPending()` at the end of `placeElements()`. Falls back to `autoGrow` when moving cannot open a window.
- `autoGrow`: grows the map BOTTOM only (bottom growth appends flat indexes, so every stored main path index and change/return point record stays valid; growing right would change the row stride and corrupt them), by the rejected footprint height plus free space, border and minimum distance. The grid, ground layer, path layer, all element layers and the border are grown or redrawn consistently (`MapBorderGenerator.redrawBorderForGrownMap`). Limitation: an `entryPosition` is not repositioned on growth - maps with entry positions should set an explicit `mapSize` (a critical log reports this case).

Every successful placement is recorded in `generator.placedElementsJournal` as {elementType, elementNumber, position, width, height, freeSpaceAround, allowPathsInFreeSpace, movable, layerNames}.

---

## Annotation Rules (`CompositeTileAnnotationBuilder`)

`buildTileAnnotations()` adds `tiles[]` to each tileset entry in the composite.

For each tileset, annotations come from:
1. `effectiveTileOptions` (merged global + per-tileset options): `groundTile`, `pathTile`, `borderTile`, `surroundingTiles`, `corners`, `bordersTiles`
2. `tileset.spots[]`: for each spot with a `spotTile`, adds multiple annotations

**Spot tile annotations (on `spot.spotTile` ID):**
```javascript
{ id: spot.spotTile, properties: [{ name: 'groundSpots', value: normalizedKey }] }
{ id: spot.spotTile, properties: [{ name: 'key', value: normalizedKey+'-middle-center' }] }
{ id: spot.spotTile, properties: [{ name: 'key', value: normalizedKey+'-corner-top-left' }] }
```

The `'groundSpots'` annotation causes `fetchPathTiles()` to register `groundSpots[spotKey] = newTileId`.
The `'{spotKey}-middle-center'` annotation creates `groundSpotsPropertiesMappers[spotKey]` and sets `surroundingTilesPosition['spot_001-middle-center']`.
The `'{spotKey}-corner-top-left'` annotation sets `cornersPosition['spot_001-top-left']`.

Both `surroundingTilesPosition` and `cornersPosition` must be non-empty for `fromPropertiesMappersList` to use the PropertiesMapper path (otherwise falls back to wangset).

**Annotation key format:**
- Surrounding: 3 dash-separated parts → `useSpotPropertyMapper = true` (e.g. `'spot_001-top-left'` splits as `['spot_001','top','left']`)
- Corner: 4 dash-separated parts → `useSpotPropertyMapper = true` (e.g. `'spot_001-corner-top-left'` splits as `['spot_001','corner','top','left']`)
- 5+ parts → IGNORED silently

---

## Data Flow Summary (Tile ID through the Pipeline)

```
UI: user sets spot.spotTile = 5 (tileset-local index, 0-based)
                                  ↓
composite.json: tileset firstgid=1, spot tile annotation id=5
  tile GID in composite = firstgid + 5 = 6
                                  ↓
TileMapOptimizer: tile 6 placed in tileset-ref layer → survives → newImagesPositions[6] = N
  annotation id remapped: old_id=5 → new_id = N-1
                                  ↓
optimized composite: tile annotation id = N-1, layer data values = N
  tileset firstgid = 1
                                  ↓
fetchPathTiles(): newTileId = tileset.firstgid + tile.id = 1 + (N-1) = N
  groundSpotsPropertiesMappers['spot_001'].mapSurroundingByKey('spot_001-middle-center', N)
                                  ↓
PropertiesMapper.map():
  surroundingTilesPosition['spot_001-middle-center'] = N
                                  ↓
TilesShortcuts.fromPropertiesMappersList():
  mappedData.surroundingTilesPosition = {'spot_001-middle-center': N, ...}
  new TilesShortcuts(mainTile=0, surroundingTilesPosition, cornersPosition, prefix='spot_001-')
  this.sMC = surroundingTilesPosition['spot_001-middle-center'] = N
  this.p = 0 === pathTile(0) && 0 !== N ? N : 0 = N
                                  ↓
SpotGenerator: spotTile = spotTilesShortcuts.p = N  (correct optimized tile ID)
```

---

## Example Files vs UI-Generated Flow

The example configs in `examples/layer-elements-composite/` are **hand-crafted** and bypass the `tileset-to-tilemap` UI tool entirely. Key differences:

- `spotTile` — examples: absent (uses groundTile fallback); UI-generated: absent when null, `0` when set
- `tilesKey` — examples: explicit string e.g. `'cave'`, shared across multiple spots; UI-generated: normalized spot name e.g. `'spot_001'`, unique per spot
- `applyCornersTiles` — examples: explicit `true`/`false`; UI-generated: derived from `0 < Object.keys(surroundingTiles).length`
- `borderInnerWalls` — examples: wangset name string e.g. `'cave-inner-walls'`; UI-generated: boolean `true`/`false`
- `borderOuterWalls` — examples: wangset name string e.g. `'cave-outer-walls'`; UI-generated: boolean `true`/`false`
- `wallsLayerSuffix` — examples: present e.g. `'-collisions'`; UI-generated: absent (generator defaults to `''`)
- `borderLayerSuffix` — examples: present e.g. `'-collisions-over-player'`; UI-generated: absent (generator defaults to `''`)
- `outerWallsLayerSuffix` — examples: present; UI-generated: absent (generator defaults to `''`)

**`borderInnerWalls` as boolean vs string:** `spot-generator.js` uses `if(groundSpotConfig.borderInnerWalls)` — truthy check only. Both `true` and `'cave-inner-walls'` are truthy. The actual wangset looked up is always `tilesKey + '-inner-walls'`, never `borderInnerWalls` itself.

**Multiple spots sharing a `tilesKey`:** In dungeon example, `caveRooms`/`caveSingle`/`cavesBig` all use `tilesKey: 'cave'`. This means they all use the same tile annotations from the `cave` tileset (one `PropertiesMapper` for all three spots). In UI flow, each spot gets its own `tilesKey` = normalized spot name.

---

## Critical Utility Behaviors

### `sc.hasOwn` and `sc.get` with null values — `@reldens/utils/lib/shortcuts.js`

```javascript
hasOwn(obj, prop) {
    return obj && {}.hasOwnProperty.call(obj, prop) && 'undefined' !== typeof obj[prop];
}
get(obj, prop, defaultReturn) {
    return this.hasOwn(obj, prop) ? obj[prop] : defaultReturn;
}
```

**The critical trap**: `typeof null === 'object'`, NOT `'undefined'`. Therefore:

- `sc.hasOwn(spot, 'width')` returns **true** when `spot.width = null`
- `sc.get(spot, 'width', 5)` returns **null** (not `5`) when `spot.width = null`
- The fallback is only used when the key is **absent** or set to `undefined`

This means: if you want to guard against null values, you cannot rely on `sc.get` fallback. You must explicitly check for null:
```javascript
let raw = sc.get(spot, 'width', null);
let width = (null !== raw && 0 < raw) ? raw : 5;
```

### `splitByLayerName` — `tileset-ref` layer is intentionally excluded from `croppedElements`

In `ElementsProvider.splitByLayerName()`, each layer name is split by `-`. Layer names with fewer than 3 parts are skipped with `Logger.error`. The `tileset-ref` layer name has 2 parts (`['tileset', 'ref']`), so it is always excluded from `croppedElements`. This is correct behavior — `tileset-ref` exists solely to ensure annotated tiles survive `TileMapOptimizer`, not to be used as an element for placement.

### `elementsProvider.groundSpots` vs config `groundSpots`

These are two different things with the same name:

- `elementsProvider.groundSpots` — `{ spotKey: newTileId }` — tile IDs only, populated by `fetchPathTiles()` from the `groundSpots` tile annotation
- config `groundSpots` — `{ spotKey: { layerName, tilesKey, width, height, quantity, ... } }` — full placement config, read from `map-generator-config.json`

`MapDataMapper.fromProvider()` uses `Object.assign(sc.deepJsonClone(props), {...})`. The `groundSpots` key is NOT in the override object, so it comes from the original `props` (the config JSON). If you see `groundSpots` being used for tile ID lookup in `SpotGenerator`, that comes from `elementsProvider.groundSpotsPropertiesMappers`, not from `elementsProvider.groundSpots`.

---

## Spot Dimension Handling

### Null-Safe Width and Height in `buildGroundSpotConfig()`

`buildGroundSpotConfig()` reads `width` and `height` from the spot data using null-safe logic:

```javascript
let rawWidth = sc.get(spot, 'width', null);
let rawHeight = sc.get(spot, 'height', null);
// ...
width: (null !== rawWidth && 0 < rawWidth) ? rawWidth : 5,
height: (null !== rawHeight && 0 < rawHeight) ? rawHeight : 5,
```

`sc.get` uses `hasOwn` internally: it returns the fallback only when the key is absent or `undefined`. A key set to `null` passes `hasOwn` and returns `null`, not the fallback — so the null check is explicit. When `width` or `height` is null or `<= 0`, the fallback of `5` is used, matching the default from `buildDefaultSpot()`.

On the client side, `spot-editor.js` `initNumberSpotProp()` normalizes null number values at render time:
- When `spot[key]` is null or undefined AND the input has a positive `min` attribute, both `spot[key]` and `el.value` are set to `+el.min`
- Width and height inputs have `min="1"`, so null dimensions become `1` at the moment the spot row is rendered

### Spot Tile Selection and Ground Tile Fallback

When `spot.spotTile = null` (user has not picked a tile), `config.spotTile` is absent from the output of `buildGroundSpotConfig()`. In the generator, `sc.get(groundSpotConfig, 'spotTile', this.groundTile)` returns `this.groundTile` as fallback — the spot is filled with the same tile as the ground. The spot is placed correctly in the layer, but it is visually indistinguishable from the surrounding terrain. Always pick a spot tile when the spot needs to be visually distinct from the ground.

---

## Stage 3d: `generateLayersList()` — Assembling the Final Layer Stack

**Entry:** `RandomMapGenerator.generateLayersList()` — `random-map-generator.js:375`

Called after all element/path generation is complete. Assembles `staticLayers` then filters/merges into final layer array.

```
generateLayersList()
  // places each non-element, non-depth spot onto the full map grid at a random position
  → spotGenerator.generateInvisibleSpots(staticLayers, generatedSpots, mapWidth, mapHeight)
  // adds ground, collisions-map-border, ground-variations, path, inner/outer wall layers
  → staticLayers.push(groundLayer, ...)
  // merges staticLayers with additionalLayers (element layers from placeElements())
  → mergeLayersByTileValue(staticLayers, additionalLayers)
  // re-orders layers based on depth spec (only if generateSpotsWithDepth is non-empty)
  → reorderLayersBasedOnSpots(layers)
  // replaces null tiles with 0; logs error for each null
  → null-tile sanitization loop
  // removes fully-empty layers to reduce file size
  → layers.filter(layer => layer.data.some(tile => tile !== 0))
  // merges layers sharing a name sub-key (autoMergeLayersByKeys)
  → mergeLayersByNameSubstring(layers, matchKey)
  // assigns sequential IDs
  → applyLayersIds(layers)
```

### `SpotGenerator.generateInvisibleSpots()` — `spot-generator.js:190`

```javascript
invisibleSpotsKeys = Object.keys(generatedSpots).filter(
    key => !generatedSpots[key].isElement && !generatedSpots[key].depth
)
for each spotKey in invisibleSpotsKeys:
    groundSpotConfig = generatedSpots[spotKey]
    if(!groundSpotConfig.spotLayers) → Logger.warning, continue
    for each spotLayerKey in groundSpotConfig.spotLayers:
        spotLayerData = groundSpotConfig.spotLayers[spotLayerKey]
        spotMapLayerData = Array(mapWidth * mapHeight).fill(0)
        randomX = Math.floor(Math.random() * (mapWidth - groundSpotConfig.width))
        randomY = Math.floor(Math.random() * (mapHeight - groundSpotConfig.height))
        for y in 0..groundSpotConfig.height-1:
            for x in 0..groundSpotConfig.width-1:
                tileIndex = y * groundSpotConfig.width + x
                if spotLayerData[tileIndex] === 0: continue
                spotMapLayerData[randomY*mapWidth + randomX + y*mapWidth + x] = spotLayerData[tileIndex]
        staticLayers.push(generateLayerWithData(spotLayerKey, spotMapLayerData))
```

**Requirements for spot to appear:**
- `generatedSpots[spotKey].isElement` must be `false` — if `true`, placed as element not invisible spot
- `generatedSpots[spotKey].depth` must be falsy — if truthy, placed with depth ordering
- `groundSpotConfig.spotLayers` must exist and be non-empty — populated by `generateSpots()`
- `groundSpotConfig.width > 0` and `groundSpotConfig.height > 0` — if either is 0 or null, the loop bounds fail: `(mapWidth - 0)` gives full range but inner loop `for y=0; y < 0` never executes
- `spotLayerData` must have at least one non-zero entry — if the spot layer is all zeros the layer passes placement but is filtered out by the empty-layer filter

### Empty Layer Filter

```javascript
layers = layers.filter(layer => {
    let keepLayer = layer.data.some(tile => tile !== 0);
    if(!keepLayer){
        Logger.debug('Empty layer will be removed: '+layer.name);
    }
    return keepLayer;
});
```

A spot layer with all-zero data (because `width/height` was 0/null at `createSpotLayerData` time) gets removed here. This was the original symptom: the layer was created but immediately filtered as empty.

---

## TileMapOptimizer In-Place Mutation — Critical Behavior

**File:** `tile-map-optimizer/lib/tile-map-optimizer.js`

`TileMapOptimizer` receives `originalJSON: this.tileMapJSON` and immediately sets `this.newJSON = this.originalJSON` — **same reference, NOT a clone**.

`createNewJSON()` then modifies `this.newJSON.layers[i].data[j]` in-place. Because `newJSON === originalJSON === elementsProvider.tileMapJSON`, after `optimizeMap()` returns:

- `elementsProvider.tileMapJSON.layers[i].data` contains **optimized GIDs** (old → new position via `newImagesPositions`)
- The original GID values are gone

**Consequence for `splitByLayerName()`** (called AFTER `optimizeMap()`):

```javascript
// Line 64 in elements-provider.js:
async splitElements() {
    // tileMapJSON.layers now have optimized GIDs after this call
    await this.optimizeMap();
    // reads optimized GIDs
    this.elementsLayers = this.splitByLayerName();
```

So when `splitByLayerName()` collects `layer.data.filter(tile => tile !== 0)` for `elementsVariations["spot_001"]`, those values are already the **optimized GIDs** of the spot variation tiles. No re-mapping needed.

Similarly, `croppedElements` for all element layers contain optimized GIDs already, so tile IDs placed in the final map are always from the single combined optimized tileset. ✓

---

## Validation Flow — Why `groundTile=0` Does Not Block Generation

**File:** `tile-map-generator/lib/validator/options-validator.js:55`

```javascript
if(!sc.get(options, 'groundTile')){
    this.lastError = 'Missing required option: "groundTile".';
    return false;
}
```

`!sc.get(options, 'groundTile')` is truthy when `groundTile === 0`. This would fail validation if `groundTile` were 0. However, `groundTile` is NOT 0:

1. The composite's terrain tileset annotates tile id=41 (GID=42) with `key: "groundTile"` property
2. `fetchPathTiles()` reads the OPTIMIZED tileset's `tiles[]`. For this tile: `newTileId = 1 + (newImagesPositions[42] - 1) = newImagesPositions[42]`
3. `elementsProvider.groundTile = newImagesPositions[42]` — a non-zero position in the optimized tileset
4. `MapDataMapper.fromProvider()` overrides `groundTile: elementsProvider.groundTile` with this non-zero value
5. `validate()` sees a non-zero `groundTile` → passes ✓

**If the composite had NO `key: "groundTile"` annotation:** `elementsProvider.groundTile` would remain 0, `validate()` would return false, and `generate()` would return false without writing any map file. The `tileOptions.groundTile = 42` in the config JSON is extracted to top-level in `partialData` by `MapsWizardConfigBuilder.applyTileOptions()`, but `MapDataMapper.fromProvider()` overrides it with `elementsProvider.groundTile`. Therefore the `key: "groundTile"` annotation on the tileset is mandatory.

---

## MapsWizardConfigBuilder — `tileOptions` Flattening

**File:** `tileset-to-tilemap/lib/maps-wizard-config-builder.js:32`

```javascript
buildPartialGeneratorData(config)
{
    let strategy = sc.get(config, 'generatorType', TilesetConst.GENERATOR_TYPES.COMPOSITE);
    let compositeElementsFile = sc.get(config, 'compositeElementsFile', '');
    let partialData = {compositeElementsFile, automaticallyExtrudeMaps: 1};
    // strategy-specific fields...
    let tileOptions = sc.get(config, 'tileOptions', null);
    if(tileOptions){
        this.applyTileOptions(partialData, tileOptions);  // spreads groundTile, pathTile, etc. to top level
    }
    let groundSpots = sc.get(config, 'groundSpots', null);
    if(groundSpots){
        partialData.groundSpots = groundSpots;
    }
    return {strategy, partialData};
}
```

**`applyTileOptions(partialData, tileOptions)`** copies these keys from `tileOptions` to top-level `partialData`:
`groundTile`, `pathTile`, `borderTile`, `randomGroundTiles`, `surroundingTiles`, `corners`, `bordersTiles`, `borderCornersTiles`

This is critical: `map-generator-config.json` stores tile options nested under `tileOptions`, but the Maps Wizard form expects them as top-level properties. `buildPartialGeneratorData()` bridges this gap. The returned `partialData.groundTile = 42` is what the form gets pre-filled with, and `buildGeneratorData()` then serializes it back as a top-level key in `generatorData` submitted to the server.

---

## Key File Reference

### tileset-to-tilemap package
- `tileset-to-tilemap/lib/routes/generate.js` — `GenerateRoute.handle()` — server endpoint called by the UI generate button; reads `req.body.{tilesets, fullTilesets, sessionId, mapName, mapTitle, globalTileOptions}` and delegates to `TilesetFilesBuilder.build()`
- `tileset-to-tilemap/lib/tileset-files-builder.js` — `build()`, `buildCompositeEntries()`, `buildTilesetFilesEntries()`, `buildElementFiles()` — main file-generation orchestrator; iterates `tilesets` (serialized from UI state including `tileset.spots[]`); skips elements with `type === 'spot'` in `buildElementFiles()` since spots use the config path not the element-JSON path
- `tileset-to-tilemap/lib/composite-builder.js` — `buildCompositeJSON()`, `createTilesetEntry()`, `buildVariationLayers()`, `buildElementLayers()`
- `tileset-to-tilemap/lib/composite-annotation-resolver.js` — `resolve()`, `resolvePathTileCompositeId()`, `applyMergedToEffective()`, `applyGlobalAsDefault()`
- `tileset-to-tilemap/lib/composite-wangset-builder.js` — `buildSpotWangsets()`, `buildWangset()`, `getWangids()`
- `tileset-to-tilemap/lib/composite-tile-annotation-builder.js` — `buildTileAnnotations()`, `addSpotAnnotations()`, `collectAnnotatedFlatIds()`
- `tileset-to-tilemap/lib/tileset-composite-config-builder.js` — `buildConfigData()`, `buildGroundSpotConfig()`, `buildTilesetData()`
- `tileset-to-tilemap/lib/maps-wizard-config-builder.js` — `buildPartialGeneratorData()` — server-side builder that converts `map-generator-config.json` into `{strategy, partialData}` for the Maps Wizard API; extracts `groundSpots` from config and includes it in `partialData`

### tile-map-optimizer package
- `tile-map-optimizer/lib/tile-map-optimizer.js` — `optimize()`, `parseJSON()`, `createThumbsFromLayersData()`, `createNewJSON()`, `fetchNewImagePositionForTile()`

### tile-map-generator package
- `tile-map-generator/lib/random-map-generator.js` — `fromElementsProvider()`, `generate()`, `mapTilesShortcuts()`, `setOptions()`
- `tile-map-generator/lib/generator/elements-provider.js` — `splitElements()`, `optimizeMap()`, `fetchPathTiles()`, `splitByLayerName()`, `cropMapToMinimumArea()`
- `tile-map-generator/lib/map/data-mapper.js` — `fromProvider()` — merges `deepClone(props)` (retains original `groundSpots` full config) with provider data overrides (adds `groundSpotsPropertiesMappers` from ElementsProvider); `groundSpots` intentionally NOT taken from `elementsProvider.groundSpots` (which is `{spotKey: tileId}` not config)
- `tile-map-generator/lib/map/tiles-shortcuts.js` — `fromPropertiesMappersList()`, `mapWangsetData()`, `fetchWangsetByName()`, constructor
- `tile-map-generator/lib/map/wangset-mapper.js` — `mapPositionsFromWangset()`, `fetchTopCenterTile()`, constructor
- `tile-map-generator/lib/generator/properties-mapper.js` — `map()`, `mapSurroundingByKey()`, `mapCornersByKey()`, `mapSurroundingByPosition()`, `mapCornersByPosition()`
- `tile-map-generator/lib/generator/spot-generator.js` — `generateSpots()`, `createSpotLayerData()`, `generateInvisibleSpots()`, `saveLayerElements()`, `createVariationsLayer()`
- `tile-map-generator/lib/generator/walls-generator.js` — `createLayerInnerWalls()`, `createLayerOuterWalls()`, `determineWallTiles()`, `placeWallTiles()`
- `tile-map-generator/lib/generator/path-connector.js` — `connectPaths()`, `placeMainPath()`
- `tile-map-generator/lib/loader/layer-elements-composite-loader.js` — `load()` — loads `mapData` from `props.mapData` (form submission data), loads composite JSON from `compositeElementsFile`, sets `mapData.tileMapJSON`
- `tile-map-generator/lib/loader/layer-elements-object-loader.js` — `load()` — alternative loader for `elements-object-loader` strategy; loads `mapData` + `layerElements` from files; does NOT use ElementsProvider, does NOT build `groundSpotsPropertiesMappers`

### reldens/src admin UI
- `src/lib/admin/server/subscribers/maps-wizard-subscriber.js` — handles POST `/maps-wizard`; reads `req.body.generatorData` → `sc.toJson()` → `mapData`; handles GET `/api/session-wizard-config` (reads `map-generator-config.json`, calls `MapsWizardConfigBuilder.buildPartialGeneratorData()`, returns `{strategy, partialData}`)
- `src/lib/admin/server/subscribers/maps-wizard-runner.js` — `MapsWizardRunner.run()` — routes to `LayerElementsCompositeLoader` + `generator.fromElementsProvider()` for `elements-composite-loader` strategy
- `src/theme/admin/js/tileset-to-tilemap/tileset-generator.js` — `TilesetGenerator.generate()`, `serializeTileset()`, `runGenerate()` — client-side; `serializeTileset()` includes `spots: tileset.spots || []` in the POST body; fires POST to `generate` endpoint
- `src/theme/admin/js/tileset-to-tilemap/state-builder.js` — `StateBuilder.buildTileset()` — loads spots from session data as `tilesetData.spots || []` with no normalization; old sessions may have `width: null, height: null` on spot objects
- `src/theme/admin/js/tileset-to-tilemap/spot-editor.js` — `TilesetSpotEditor.appendSpotRow()`, `initSpotProps()`, `initNumberSpotProp()` — renders spot rows in the legend panel; `initNumberSpotProp()` fixes null number props at render time using the input's `min` attribute as the default value
- `src/theme/admin/js/tileset-to-tilemap/tileset-tile-options-binder.js` — `TilesetTileOptionsBinder.buildDefaultSpot()`, `addSpot()`, `removeSpot()` — creates new spots with `width: 5, height: 5` defaults; manages spot add/remove and canvas pick state
- `src/theme/admin/js/tileset-to-tilemap/tileset-spot-props-binder.js` — `TilesetSpotPropsBinder` — binds `change` event listeners to spot prop inputs; does NOT initialize values at load time (that is done by `spot-editor.js`)
- `src/theme/admin/js/tileset-to-tilemap/tileset-tile-options-pick-handler.js` — `TilesetTileOptionsPickHandler.handleSpotTilePick()` — sets `spot.spotTile = flatIndex` (0-based tileset-local index) when user clicks a tile in the canvas; `flatIndex = row * tileset.tilesetColumns + col`
- `src/theme/admin/js/maps-wizard/maps-wizard-utils.js` — `buildGeneratorData()`, `fillInputsFromData()`, `updateGeneratorDataFromInputs()`, `updateInputsFromGeneratorData()`, `setExtraProperties()` — utility functions for the Maps Wizard form; `extraProperties` module variable preserves properties with no matching form input
- `src/theme/admin/js/maps-wizard/maps-wizard-bindings.js` — Maps Wizard event bindings and session auto-load; calls `setExtraProperties()` before `fillInputsFromData()` when loading tileset session config

---

## Composite Annotations for Spot Generation

### How `middle-center` Drives Spot Tile Resolution

`TilesShortcuts` constructor (`tiles-shortcuts.js:19`):
```javascript
this.sMC = surroundingTilesPosition[prefix+'middle-center'];
this.p   = 0 === pathTile && 0 !== this.sMC ? this.sMC : pathTile;
```

For a spot named `spot_001`:
- `prefix` is `'spot_001-'`
- `sMC` resolves to `surroundingTilesPosition['spot_001-middle-center']`
- When `spotTile` is set in the config, `pathTile` equals the configured composite GID and `p = pathTile`
- When `spotTile` is absent from the config, `pathTile = this.groundTile` and `p = this.groundTile`
- `sMC` being set to a non-zero tile ID provides the center tile for spot fill; it is used when the spot's `PropertiesMapper` was populated by the `middle-center` annotation

### Why `cornersPosition` Must Be Non-Empty

`fromPropertiesMappersList()` (`tiles-shortcuts.js:51`):
```javascript
if(
    !propertiesMapper
    || 0 === Object.keys(propertiesMapper.surroundingTilesPosition).length
    || 0 === Object.keys(propertiesMapper.cornersPosition).length
){
    mappedData = TilesShortcuts.mapWangsetData(tilesKey, optimizedMapFirstTileset);
}
```

The wangset fallback fires if EITHER `surroundingTilesPosition` OR `cornersPosition` is empty. Both must be non-empty for the PropertiesMapper path to be used. When the wangset fallback fires and no wangset named `spot_001` exists in the tileset, `surroundingTilesPosition` and `cornersPosition` both come back empty, `sMC` is undefined, and the spot tile cannot be resolved.

### Synthetic Corner Annotations in `composite-tile-annotation-builder.js`

**Method: `addSpotAnnotations()` / `addSyntheticCornerAnnotations()`**

When a spot has a `spotTile` set but `spot.corners` is empty (user picked a center tile but no corner border tiles), the composite emits synthetic corner annotations on the spot tile to keep `cornersPosition` non-empty and prevent the wangset fallback:

```javascript
let hasCorners = spot.corners && 0 < Object.keys(spot.corners).length;
if(!hasCorners){
    this.addSyntheticCornerAnnotations(tiles, spot.spotTile, normalizedKey);
}
```

`addSyntheticCornerAnnotations()` pushes all four corner position annotations onto the spot tile:
```javascript
addSyntheticCornerAnnotations(tiles, spotTile, normalizedKey)
{
    let cornerNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    for(let cornerName of cornerNames){
        tiles.push({ id: spotTile, properties: [
            { name: 'key', type: 'string', value: normalizedKey+'-corner-'+cornerName }
        ]});
    }
}
```

All 4 corners are emitted because 1 corner is sufficient to make `cornersPosition.length > 0` (preventing the fallback), but having only `top-left` leaves `cTR`, `cBL`, `cBR` undefined in `TilesShortcuts`. When `applyCornersTiles = true` with only `cTL` set, the other 3 corner cells render as tile 0. All 4 synthetic corners ensure visually uniform fill when no real corner tiles are configured.

The conditional on `!hasCorners` prevents ambiguity when real corner tiles are defined: real corners are added via `addPositionalAnnotations(spot.corners, ...)` on different tile IDs. If both synthetic and real corners were present, `fetchPathTiles()` would process both, and iteration order (determined by the optimizer) would decide which tile ID wins. The conditional ensures only one set of corner annotations is present per spot.

### Required Composite Annotations for Spots to Work

For a spot named `spot_001` with `spot.spotTile = N` to generate correctly, the optimized tileset MUST have the following `key` annotations on tile N:

- `groundSpots: "spot_001"` — Registers `groundSpots['spot_001'] = N` in `elementsProvider`
- `key: "spot_001-middle-center"` — Sets `surroundingTiles['0,0'] = N` → `sMC = N` → `p = N` → `spotTile = N`
- `key: "spot_001-corner-top-left"` — Sets `corners['-1,-1'] = N` → `cornersPosition` non-empty → prevents wangset fallback
- `key: "spot_001-corner-top-right"` — Sets `corners['-1,1'] = N` → fills TR corner with spot tile
- `key: "spot_001-corner-bottom-left"` — Sets `corners['1,-1'] = N` → fills BL corner with spot tile
- `key: "spot_001-corner-bottom-right"` — Sets `corners['1,1'] = N` → fills BR corner with spot tile

The last four (`corner-*`) are only required when `spot.corners = {}`. When real corner tiles are configured, they replace the synthetic values via their own `key: spot_001-corner-*` annotations on their respective tile IDs.

