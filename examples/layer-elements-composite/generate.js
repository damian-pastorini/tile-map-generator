/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { ElementsProvider } = require('../../lib/generator/elements-provider');
const { RandomMapGenerator} = require('../../lib/random-map-generator');
const map = require('./reldens-town.json');

const execute = async () => {

    let elementsProvider = new ElementsProvider({ map });

    await elementsProvider.splitElements();

    let optimizedMap = elementsProvider.optimizedMap;
    let optimizedTileset = optimizedMap.tilesets[0];

    let mapData = {
        rootFolder: __dirname,
        tileSize: optimizedMap.tilewidth,
        tileSheetPath: optimizedTileset.image,
        tileSheetName: optimizedTileset.image,
        imageHeight: optimizedTileset.imageheight,
        imageWidth: optimizedTileset.imagewidth,
        tileCount: optimizedTileset.tilecount,
        columns: optimizedTileset.columns,
        margin: optimizedTileset.margin,
        spacing: optimizedTileset.spacing,
        layerElements: elementsProvider.croppedElements,
        elementsQuantity: {house1: 3, house2: 2, tree: 6},
        groundTile: 116,
        mainPathSize: 3,
        blockMapBorder: true,
        freeSpaceTilesQuantity: 2,
        variableTilesPercentage: 15,
        pathTile: elementsProvider.pathTile,
        collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
        randomGroundTiles: elementsProvider.randomGroundTiles,
        surroundingTiles: elementsProvider.surroundingTiles,
        corners: elementsProvider.corners
    };

    const generator = new RandomMapGenerator(mapData);

    generator.generate();
};

execute();
