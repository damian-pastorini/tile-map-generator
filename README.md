[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens - Tile Map Generator

A procedural tile map generation package for creating random maps with pre-defined elements, optimized for Tiled Map Editor and Reldens/Phaser game development.

Need some specific feature?

[Request a feature here: https://www.reldens.com/features-request](https://www.reldens.com/features-request)

---

## Features

- Procedural map generation with customizable parameters
- Tiled Map Editor compatible JSON output
- A* pathfinding integration for path connectivity validation
- Multiple generation modes:
  - Object-based generation (individual element files)
  - Composite-based generation (single composite map)
  - Associated maps generation (multi-floor dungeons)
- Element placement with free space constraints
- Automatic path generation connecting map elements
- Map layer merging and optimization
- Support for multi-floor dungeons with stairs/change-points
- Ground tile variations and path border tiles
- Invisible spots for spawn points and special areas
- Map validation and connectivity checking

---

## Installation

```bash
npm install @reldens/tile-map-generator
```

---

## Usage

### Basic Example - Object-based Generation

```javascript
const { LayerElementsObjectLoader } = require('@reldens/tile-map-generator');
const { RandomMapGenerator } = require('@reldens/tile-map-generator');
const { Logger } = require('@reldens/utils');

async function generateMap() {
    let loader = new LayerElementsObjectLoader({
        rootFolder: __dirname,
        mapDataFile: 'examples/layer-elements-object/map-data.json'
    });

    await loader.load();

    let generator = new RandomMapGenerator(loader.mapData);
    let generatedMap = await generator.generate();

    Logger.info('Map generated:', generator.mapFileFullPath);
}

generateMap();
```

### Composite-based Generation

```javascript
const { MultipleByLoaderGenerator } = require('@reldens/tile-map-generator');
const { Logger } = require('@reldens/utils');

async function generateMultipleMaps() {
    let generator = new MultipleByLoaderGenerator({
        loaderData: {
            rootFolder: __dirname,
            mapDataFile: 'examples/layer-elements-composite/map-composite-data.json'
        }
    });

    await generator.generate();

    Logger.info('Multiple maps generated');
}

generateMultipleMaps();
```

### Associated Maps Generation (Multi-floor Dungeons)

```javascript
const { MultipleWithAssociationsByLoaderGenerator } = require('@reldens/tile-map-generator');
const { Logger } = require('@reldens/utils');

async function generateAssociatedMaps() {
    let generator = new MultipleWithAssociationsByLoaderGenerator({
        loaderData: {
            rootFolder: __dirname,
            mapDataFile: 'examples/layer-elements-composite/map-composite-data-with-associations.json'
        }
    });

    await generator.generate();

    Logger.info('Associated maps generated with stairs and connections');
}

generateAssociatedMaps();
```

---

## Configuration

### Map Data Schema (Object-based)

```json
{
    "tileSize": 32,
    "tileSheetPath": "assets/tileset.png",
    "tileSheetName": "tileset.png",
    "imageHeight": 512,
    "imageWidth": 512,
    "tileCount": 256,
    "columns": 16,
    "mapSize": {
        "mapWidth": 50,
        "mapHeight": 50
    },
    "groundTile": 1,
    "layerElementsFiles": {
        "house-001": "house-001.json",
        "house-002": "house-002.json",
        "tree": "tree.json"
    },
    "elementsQuantity": {
        "house-001": 2,
        "house-002": 3,
        "tree": 10
    },
    "pathTile": 5,
    "mainPathSize": 3,
    "generateElementsPath": true
}
```

### Key Configuration Options

**Required Options:**
- `tileSize`: Size of each tile in pixels
- `tileSheetPath`: Path to the tileset image
- `tileSheetName`: Name of the tileset file
- `imageHeight`: Tileset image height
- `imageWidth`: Tileset image width
- `tileCount`: Total number of tiles in tileset
- `columns`: Number of columns in tileset
- `groundTile`: Tile ID for ground/floor
- `layerElements`: Map elements configuration
- `elementsQuantity`: Number of each element to place

**Optional Options:**
- `mapSize`: Map dimensions (width/height)
- `pathTile`: Tile ID for paths
- `mainPathSize`: Width of main path
- `pathSize`: Width of element connection paths
- `generateElementsPath`: Auto-generate paths between elements
- `blockMapBorder`: Add collision borders to map edges
- `minimumDistanceFromBorders`: Minimum distance for element placement from borders
- `elementsFreeSpaceAround`: Free space required around elements
- `randomGroundTiles`: Tile IDs for ground variations
- `variableTilesPercentage`: Percentage of ground to vary
- `surroundingTiles`: Border/corner tile configurations
- `applySurroundingPathTiles`: Apply border tiles to paths
- `removeGroundLayer`: Remove ground layer from output
- `autoMergeLayersByKeys`: Auto-merge layers matching keys

---

## Architecture

### Core Components

**RandomMapGenerator**: Main generator class
- Initializes map grid
- Places elements with constraints
- Generates connecting paths
- Validates connectivity
- Outputs Tiled JSON format

**ElementsProvider**: Splits composite maps into individual elements

**PathFinder**: A* pathfinding wrapper for connectivity validation

**PathConnector**: Coordinates path generation between map elements, delegating to a modular path subsystem (`MainPathGenerator`, `PathRouter`, `PathTilesFinisher`, `PathExpander`)

**SpotGenerator**: Coordinates invisible-spot generation through a modular spot subsystem (`SpotLayersBuilder`, `SpotBorderAnalyzer`, `SpotFillProcessor`, `SpotBordersAndCorners`, `SpotPlacement`)

**Validators** (`lib/validator/`): Ensure map validity (boundaries, connectivity, spacing, walls, spots, ground variations)

**Loaders** (`lib/loader/`): Load and validate map configurations

**Patterns** (`lib/patterns/`): Tile pattern matching for borders and corners

**Helpers** (`lib/map/`, `lib/path-finder/`): Geometry, distance, layer, tile-counting, pattern-matching and graph utilities used across the generator

### Map Generation Flow

1. Load and validate configuration
2. Initialize empty map grid
3. Generate spots (special areas)
4. Place map border (if enabled)
5. Place centered elements (if specified)
6. Place remaining elements with free space constraints
7. Generate main path (if configured)
8. Connect elements with paths
9. Apply path border tiles (if enabled)
10. Apply ground variations (if configured)
11. Merge and optimize layers
12. Validate connectivity
13. Output Tiled JSON file

---

## Examples

See the `examples/` folder for complete examples:
- `examples/layer-elements-object/` - Object-based generation
- `examples/layer-elements-composite/` - Composite generation
- `examples/layer-elements-composite/map-composite-data-with-associations.json` - Multi-floor dungeons

---

## Testing

```bash
npm test
```

---

## Dependencies

- `@reldens/utils`: Utility functions and logging
- `@reldens/server-utils`: Server-side file operations
- `@reldens/tile-map-optimizer`: Map optimization and element splitting
- `pathfinding`: A* pathfinding algorithm

---

## Documentation

[https://www.reldens.com/documentation/tile-map-generator/](https://www.reldens.com/documentation/tile-map-generator/)

---

## License

MIT

---

### [Reldens](https://github.com/damian-pastorini/reldens/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
