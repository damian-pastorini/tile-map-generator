# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Key Commands

```bash
# Run tests
npm test

# The package is used programmatically in Node.js applications
```

## Architecture

### Core Classes

**RandomMapGenerator** (`lib/random-map-generator.js`):
- Main generator class for creating procedural tile-based maps
- Handles map grid initialization, element placement, and path generation
- Validates map connectivity using A* pathfinding
- Generates Tiled-compatible JSON output
- Supports map properties, custom layers, and element variations
- Methods: `generate()`, `fromElementsProvider()`, `placeElements()`, `generateLayersList()`

**MultipleByLoaderGenerator** (`lib/generator/multiple-by-loader-generator.js`):
- Generates multiple maps from a composite data file
- Uses LayerElementsCompositeLoader to load map configurations
- Creates separate RandomMapGenerator instances for each map

**MultipleWithAssociationsByLoaderGenerator** (`lib/generator/multiple-with-associations-by-loader-generator.js`):
- Generates multiple interconnected maps with associations
- Handles map-to-map connections (change-points and return-points)
- Supports multi-floor dungeons and connected overworld maps

**ElementsProvider** (`lib/generator/elements-provider.js`):
- Splits and processes map elements from composite Tiled maps
- Extracts individual elements (houses, trees, etc.) into separate layer groups
- Handles element cropping and optimization

**PathFinder** (`lib/path-finder/path-finder.js`):
- Wrapper for the pathfinding library
- Creates pathfinding grids from map data
- Uses A* algorithm to find paths and validate connectivity

**PathConnector** (`lib/generator/path-connector.js`):
- Connects isolated map areas with paths
- Generates main paths and element-to-path connections
- Applies path tiles with surrounding borders and corners

**WallsGenerator** (`lib/generator/walls-generator.js`):
- Generates wall tiles around paths
- Supports inner walls and outer walls
- Applies wall patterns based on surrounding tiles

**SpotGenerator** (`lib/generator/spot-generator.js`):
- Generates invisible spots (areas) on the map
- Creates nested spots with depth control
- Used for spawn points, safe zones, and special areas

**MapGridBuilder** (`lib/generator/map-grid-builder.js`):
- Initializes empty map grids
- Marks walkable/non-walkable positions
- Handles border blocking and entry positions

**PositionFinder** (`lib/generator/position-finder.js`):
- Finds valid positions for element placement
- Considers element size, free space requirements, and map constraints
- Sorts positions by distance from map center or borders

**PropertiesMapper** (`lib/generator/properties-mapper.js`):
- Maps tile properties for different tile types
- Handles surrounding tiles (borders, corners)
- Used for path tile variations

### Loaders

**LayerElementsObjectLoader** (`lib/loader/layer-elements-object-loader.js`):
- Loads map configuration from JSON files
- Validates map data against schema
- Loads individual element files (houses, trees, etc.)

**LayerElementsCompositeLoader** (`lib/loader/layer-elements-composite-loader.js`):
- Loads composite map configurations
- Handles multiple map generation from single config
- Validates against composite schema

### Validators

**OptionsValidator** (`lib/validator/options-validator.js`):
- Validates required map generation options
- Checks tileSize, tileSheet, dimensions, elements, etc.

**MapValidator** (`lib/validator/map-validator.js`):
- Validates generated map structure
- Ensures map meets requirements

**PathConnectivityValidator** (`lib/validator/path-connectivity-validator.js`):
- Validates that all map areas are reachable via paths
- Uses pathfinding to ensure connectivity

**BoundaryValidator** (`lib/validator/boundary-validator.js`):
- Validates element placement within map boundaries
- Prevents out-of-bounds placement

**ElementPlacementValidator** (`lib/validator/element-placement-validator.js`):
- Validates element placement against constraints
- Checks free space requirements and overlaps

**FreeSpaceValidator** (`lib/validator/free-space-validator.js`):
- Validates free space around elements
- Ensures minimum spacing between elements

**WallsValidator** (`lib/validator/walls-validator.js`):
- Validates wall tile placement
- Ensures proper wall patterns

**GroundVariationsValidator** (`lib/validator/ground-variations-validator.js`):
- Validates ground tile variations
- Ensures variation percentages are applied correctly

**SpotsValidator** (`lib/validator/spots-validator.js`):
- Validates spot generation
- Checks spot boundaries and nesting

### Map Components

**JsonFormatter** (`lib/map/json-formatter.js`):
- Formats map data into Tiled JSON format
- Handles proper JSON structure for Tiled compatibility

**DataMapper** (`lib/map/data-mapper.js`):
- Maps data between different formats
- Converts ElementsProvider data to map configuration

**TilesShortcuts** (`lib/map/tiles-shortcuts.js`):
- Provides shortcuts for common tile operations
- Maps tile IDs to semantic names (path, ground, wall, etc.)

**WallsMapper** (`lib/map/walls-mapper.js`):
- Maps wall tiles to positions
- Handles wall tile variations

**WangsetMapper** (`lib/map/wangset-mapper.js`):
- Maps Tiled Wangset tiles
- Handles terrain transitions

### Patterns

**BordersAndCornersTiles** (`lib/patterns/borders-and-corners-tiles.js`):
- Defines tile patterns for borders and corners
- Provides sequences for pattern matching and replacement

**Corners** (`lib/patterns/corners.js`):
- Corner tile patterns
- Handles corner transitions

**InnerWalls** (`lib/patterns/inner-walls.js`):
- Inner wall patterns for paths
- Creates walls on the inside of path borders

**OuterWalls** (`lib/patterns/outer-walls.js`):
- Outer wall patterns for paths
- Creates walls on the outside of path borders

**OuterWallsMerge** (`lib/patterns/outer-walls-merge.js`):
- Merges outer wall patterns
- Handles wall overlap resolution

### Utilities

**DistanceCalculator** (`lib/utilities/distance-calculator.js`):
- Calculates distances between positions
- Supports Manhattan and Euclidean distance

**GeometryCalculator** (`lib/utilities/geometry-calculator.js`):
- Geometric calculations for map generation
- Area, perimeter, and shape calculations

**GraphAlgorithms** (`lib/utilities/graph-algorithms.js`):
- Graph-based algorithms for map analysis
- Connected components, shortest paths

**ElementPositionAnalyzer** (`lib/utilities/element-position-analyzer.js`):
- Analyzes element positions on the map
- Determines optimal placement

**PatternMatcher** (`lib/utilities/pattern-matcher.js`):
- Matches tile patterns in layers
- Used for tile replacement and optimization

**LayerUtility** (`lib/utilities/layer-utility.js`):
- Layer manipulation utilities
- Merge, split, and transform layers

**TileCountingUtility** (`lib/utilities/tile-counting-utility.js`):
- Counts tiles by type
- Statistical analysis of generated maps

### Schemas

**MapDataSchema** (`lib/schemas/map-data-schema.js`):
- JSON schema for object-based map data validation

**MapCompositeDataSchema** (`lib/schemas/map-composite-data-schema.js`):
- JSON schema for composite map data validation

## Important Notes

- Generates Tiled Map Editor compatible JSON maps
- Uses `@reldens/tile-map-optimizer` for output optimization and element splitting
- Integrates with `pathfinding` npm package for A* pathfinding
- Supports custom generation rules via configuration
- Can create procedural dungeons, towns, and overworld maps
- Output maps can be used directly in Reldens/Phaser
- Always uses `Logger` from `@reldens/utils` instead of console.log
- Always uses `FileHandler` from `@reldens/server-utils` for file operations
- Map layer optimization includes merging layers and removing empty layers
- Supports map associations (stairs, change-points, return-points) for multi-floor dungeons
