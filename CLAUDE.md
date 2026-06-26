## Package Overview

**@reldens/tile-map-generator** is a procedural tile map generation package for Reldens. It provides:
- Procedural map generation with customizable parameters
- Tiled Map Editor compatible JSON output
- A* pathfinding integration for path connectivity validation
- Multiple generation modes (object-based, composite-based, associated maps)
- Element placement with free space constraints
- Map layer merging and optimization
- Support for multi-floor dungeons with stairs/change-points
- Ground tile variations and path borders
- Invisible spots for spawn points and special areas

## Key Commands

```bash
# Run tests (unit tests per class + integration/golden tests)
npm test

# The package is used programmatically in Node.js applications
```

## Architecture

### Dependency Injection Convention

Sub-classes do NOT receive the whole generator. Each class receives ONLY the specific collaborators it needs (constructor injection) and reads runtime/config DATA via method arguments. `RandomMapGenerator.resetInstance()` constructs every sub-instance in dependency order and wires the specific collaborators into each one. When adding or extracting a class, pass it the concrete collaborators it uses (never the whole generator) and make sure those collaborators are created before it in `resetInstance()`.

### Core Classes

**RandomMapGenerator** (`lib/random-map-generator.js`):
- Main generator class for creating procedural tile-based maps
- Owns option parsing (`setOptions` and the `assign*`/`initializeRuntimeState` helpers), builds the Tiled map object (`createTiledMapObject`), and constructs/wires all sub-instances in `resetInstance()`
- Handles map grid initialization, element placement, and path generation
- Validates map connectivity using A* pathfinding
- Generates Tiled-compatible JSON output
- Methods: `generate()`, `fromElementsProvider()`, `placeElements()`, `generateLayersList()`

**MultipleByLoaderGenerator** (`lib/generator/multiple-by-loader-generator.js`):
- Generates multiple maps from a composite data file
- Uses LayerElementsCompositeLoader to load map configurations
- Creates separate RandomMapGenerator instances for each map

**MultipleWithAssociationsByLoaderGenerator** (`lib/generator/multiple-with-associations-by-loader-generator.js`):
- Generates multiple interconnected maps with associations
- Handles map-to-map connections (change-points and return-points)
- Supports multi-floor dungeons and connected overworld maps

**AssociatedMaps** (`lib/generator/associated-maps.js`):
- Builds the associated sub-maps (floors) and their naming/titles from composite associations

**ElementsProvider** (`lib/generator/elements-provider.js`):
- Splits and processes map elements from composite Tiled maps
- Extracts individual elements (houses, trees, etc.) into separate layer groups
- Handles element cropping and optimization

**PathFinder** (`lib/path-finder/path-finder.js`):
- Wrapper for the pathfinding library
- Creates pathfinding grids from map data
- Uses A* algorithm to find paths and validate connectivity

**WallsGenerator** (`lib/generator/walls-generator.js`):
- Generates wall tiles around paths (inner and outer walls)
- Applies wall patterns based on surrounding tiles

**MapGridBuilder** (`lib/generator/map-grid-builder.js`):
- Initializes empty map grids, marks walkable/non-walkable positions, builds the pathfinding grid, and handles border blocking

**PositionFinder** (`lib/generator/position-finder.js`):
- Finds valid positions for element placement considering element size, free space and map constraints

**ElementsPlacer** / **CenteredElementsPlacer** / **ElementLayerWriter** (`lib/generator/`):
- Place elements (with free-space rules), place map-centered elements, and write per-instance element layers

**MapBorderGenerator** (`lib/generator/map-border-generator.js`):
- Builds the collision map border and entry positions

**MapLayersComposer** (`lib/generator/map-layers-composer.js`):
- Assembles, merges (by tile value and by name substring), reorders and id-assigns the final layer list

**PropertiesMapper** (`lib/generator/properties-mapper.js`):
- Maps tile properties (surrounding tiles, corners) for path/spot tile variations

**TilePositionCalculator** (`lib/generator/tile-position-calculator.js`):
- Tile index math, border checks and return-index resolution

**ReturnPointWriter** (`lib/generator/return-point-writer.js`):
- Records return-points and change-points into the provided state objects (no generator coupling)

**DebugHelper** (`lib/generator/debug-helper.js`) / **FileOperations** (`lib/generator/file-operations.js`):
- Optional debug map file writing and generated-file cleanup

### Path Subsystem

`PathConnector` coordinates path generation and delegates to focused, injected sub-classes:

**PathConnector** (`lib/generator/path-connector.js`):
- Orchestrates path connectivity: builds the pathfinding grid, routes element paths, applies surrounding/border tiles and walls

**MainPathGenerator** (`lib/generator/main-path-generator.js`):
- Generates the main path indexes (random/opposite), places them, and records the default return-point

**PathRouter** (`lib/generator/path-router.js`):
- Finds path-tile positions, sorts them by distance, and routes A* paths between points

**PathExpander** (`lib/generator/path-expander.js`):
- Expands single-tile paths to the configured `pathSize` (working data held as fields)

**PathTilesFinisher** (`lib/generator/path-tiles-finisher.js`):
- Fills single-tile gaps, cleans path border tiles, fetches border-end tiles, and builds path inner/outer walls

### Spot Subsystem

`SpotGenerator` coordinates invisible-spot generation and delegates to focused, injected sub-classes:

**SpotGenerator** (`lib/generator/spot-generator.js`):
- Generates invisible spots (areas), nested spots with depth control; used for spawn points, safe zones and special areas

**SpotLayersBuilder** (`lib/generator/spot-layers-builder.js`):
- Builds spot layer data, random path layers, variation layers and the invisible-spots layers

**SpotBorderAnalyzer** (`lib/generator/spot-border-analyzer.js`):
- Finds border tiles, continuous sequences and adjacent border tiles for spots

**SpotFillProcessor** (`lib/generator/spot-fill-processor.js`):
- Fills spot tiles, internal holes and perimeter balancing

**SpotBordersAndCorners** (`lib/generator/spot-borders-and-corners.js`):
- Applies split borders/corners and border-end tiles for spots and paths

**SpotPlacement** (`lib/generator/spot-placement.js`):
- Finds free spot placement and rectangle-overlap checks

### Loaders (`lib/loader/`)

**LayerElementsLoader**: Base loader (shared load/validate payload flow).

**LayerElementsObjectLoader**: Loads object-based map configuration from JSON files; loads individual element files; validates against the object schema.

**LayerElementsCompositeLoader**: Loads composite map configuration; supports multiple-map generation; validates against the composite schema.

**ElementsFromLayersLoader**: Loads element groups from already-laid-out map layers.

### Validators (`lib/validator/`)

**OptionsValidator**: Validates required generation options (tileSize, tileSheet, dimensions, elements, etc.); exposes `lastError`.

**MapValidator**: Base map-structure validation; classifies non-zero tiles.

**MapTypeValidator**: Determines map type (dungeon/enclosed/normal/basic) and validates type-specific patterns.

**PathConnectivityValidator**: Validates all areas are reachable via paths (uses pathfinding); analyzes gaps and width consistency.

**BoundaryValidator**: Validates map/layer structure and element placement within boundaries.

**ElementPlacementValidator**: Validates element quantities and overlaps.

**FreeSpaceValidator**: Validates free space around elements and paths-in-free-space.

**WallsValidator**: Validates inner/outer wall placement, wall tile types and corner placement.

**GroundVariationsValidator**: Validates ground variation tile types and placement percentages.

**SpotsValidator**: Validates spot dimensions, quantities and connectivity.

**GeneratorClassesValidator**: Validates JSON/composite structure and association structure.

### Map Components (`lib/map/`)

**JsonFormatter**: Formats map data into Tiled JSON structure.

**MapDataMapper** (`data-mapper.js`): Converts ElementsProvider data into map configuration.

**LayerDataFactory**: Layer-data primitives - `tileIndex`, `forEachMapCell`, empty-layer creation, tile-array merging, padding.

**GeometryCalculator**: Geometry/adjacency - distances, neighbor positions, bounds checks, connected-tile counting, footprint walkability, placement offsets.

**DistanceCalculator**: Manhattan/Euclidean distance helpers.

**ElementPositionAnalyzer**: Analyzes element tile positions and pairs on the map.

**PatternMatcher**: Counts element instances / matches tile patterns in layers.

**LayerUtility**: Layer find/merge/transform helpers.

**TileCountingUtility**: Counts tiles by type (statistics).

**LayerComponentSplitter**: Splits a layer into connected components.

**TileVariationsApplier**: Applies random ground tile variations by percentage.

**TilesShortcuts** / **TileShortcutsMapper**: Map tile IDs to semantic shortcut names (path, ground, wall, borders, corners).

**WangsetMapper** / **WallsMapper**: Map Tiled Wangset/terrain transitions and wall tiles to positions.

**MapNaming**: Builds map/group names and suffixes.

**ElementMover** / **ElementDeleter** / **ElementsToLayersBuilder** / **ElementLayerName** / **ElementNameSuffix**: Post-generation element operations (move/delete; rebuild element layers from an element record, optionally merging them via a single order-preserving pass that collapses non-overlapping same-type layers and spills to `merge-{type}-N` only on a real tile overlap, never reordering by type; per-instance layer naming and unique suffixes).

### Path-Finder (`lib/path-finder/`)

**PathFinder**: A* wrapper (see Core Classes).

**GraphAlgorithms**: Connectivity graph building, adjacency, isolated-node detection and path continuity validation.

### Patterns (`lib/patterns/`)

**BordersPatterns**: Sequence replacement and 90-degree rotation/rollback pipeline; owns `applyBordersAndCornersTiles` and `applyRotationToCompletePathGrid`.

**BordersAndCornersTiles**: Tile pattern sequences for borders and corners.

**Corners** / **InnerWalls** / **OuterWalls** / **OuterWallsMerge**: Corner and inner/outer wall patterns and overlap resolution.

### Schemas (`lib/schemas/`)

**MapDataSchema**: JSON schema for object-based map data validation.

**MapCompositeDataSchema**: JSON schema for composite map data validation.

### Constants (`lib/constants.js`)

**GeneratedFoldersConstants**: Shared folder constants (e.g. `OPTIMIZED_SUB_FOLDER`). Exported from the package entry point (`index.js`).

## Testing

- `tests/run.js` auto-discovers every `tests/test-*.js` (and `tests/functionality/`, `tests/integration/`) whose first export is the test class - no manual registration.
- Every class has a focused **unit test** (`tests/test-<class>.js`) extending `BaseMapGeneratorTest`, plus **integration/golden** tests that run full generation and compare output.
- Use `ElementFixtures` for map/element fixtures and `this.seedRandom(seed)` for deterministic randomness.

## Important Notes

- Generates Tiled Map Editor compatible JSON maps
- Uses `@reldens/tile-map-optimizer` for output optimization and element splitting
- Integrates with `pathfinding` npm package for A* pathfinding
- Supports custom generation rules via configuration
- Can create procedural dungeons, towns, and overworld maps
- Output maps can be used directly in Reldens/Phaser
- Always uses `Logger` from `@reldens/utils` instead of console.log
- Always uses `FileHandler` from `@reldens/server-utils` for file operations
- Always prefers `sc` (Shortcuts) helpers from `@reldens/utils` (e.g. `sc.inArray`, `sc.randomValueFromArray`, `sc.shuffleArray`)
- Sub-classes receive specific collaborators (not the whole generator); they are constructed in dependency order in `RandomMapGenerator.resetInstance()`
- Map layer optimization includes merging layers and removing empty layers
- Supports map associations (stairs, change-points, return-points) for multi-floor dungeons
