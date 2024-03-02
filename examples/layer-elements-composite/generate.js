/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { ElementsProvider } = require('../../lib/generator/elements-provider');
const { RandomMapGenerator} = require('../../lib/random-map-generator');
const map = require('./reldens-town-composite.json');
const rootFolder = __dirname;

const execute = async () => {
    let elementsProvider = new ElementsProvider({map, rootFolder});
    await elementsProvider.splitElements();
    let optimizedMap = elementsProvider.optimizedMap;
    let optimizedTileset = optimizedMap.tilesets[0];
    let mapData = {
        rootFolder,
        tileSize: optimizedMap.tilewidth,
        tileSheetPath: elementsProvider.fileHandler.joinPaths('generated', optimizedTileset.image),
        tileSheetName: optimizedTileset.image,
        imageHeight: optimizedTileset.imageheight,
        imageWidth: optimizedTileset.imagewidth,
        tileCount: optimizedTileset.tilecount,
        columns: optimizedTileset.columns,
        margin: optimizedTileset.margin,
        spacing: optimizedTileset.spacing,
        tiles: optimizedTileset.tiles,
        layerElements: elementsProvider.croppedElements,
        elementsQuantity: elementsProvider.elementsQuantity,
        groundTile: elementsProvider.groundTile,
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
