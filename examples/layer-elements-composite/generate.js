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
        pathTile: 121,
        collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
        randomGroundTiles: [26, 27, 28, 29, 30, 36, 37, 38, 39, 50, 51, 52, 53],
        surroundingTiles: {
            '-1,-1': 127, // 294, // top-left
            '-1,0': 124, // 295, // top-center
            '-1,1': 130, // 296, // top-right
            '0,-1': 126, // 293, // middle-left
            // '0,0': 121, // 297, // middle-center
            '0,1': 129, // 289, // middle-right
            '1,-1': 132, // 292, // bottom-left
            '1,0': 131, // 291, // bottom-center
            '1,1': 133, // 290, // bottom-right
        },
        corners: {
            '-1,-1': 285, // 294, // top-left
            '-1,1': 284, // 296, // top-right
            '1,-1': 283, // 292, // bottom-left
            '1,1': 282, // 290, // bottom-right
        }
    };

    const generator = new RandomMapGenerator(mapData);

    generator.generate();
};

execute();
