/**
 *
 * Reldens - Tile Map Generator - MapDataSchema
 *
 */

module.exports.MapDataSchema = {
    tileSize: {type: 'int'}, // size in pixels = 32
    tileSheetPath: {type: 'string'}, // 'tilesheet.png',
    tileSheetName: {type: 'string'}, // 'tilesheet.png',
    imageHeight: {type: 'int'}, // size in pixels = 578,
    imageWidth: {type: 'int'}, // size in pixels = 612,
    tileCount: {type: 'int'}, // number of tiles = 306,
    columns: {type: 'int'}, // for example = 18,
    margin: {type: 'int'}, // size in pixels = 1,
    spacing: {type: 'int'}, // size in pixels = 2,
    elementsQuantity: {type: 'object'},
    groundTile: {type: 'int'}, // tile index from the tile set used for the ground = 116,
    mainPathSize: {type: 'int'}, // number of tiles to be occupied by the main path starting point = 3,
    blockMapBorder: {type: 'boolean'}, // true,
    freeSpaceTilesQuantity: {type: 'int'}, // number of tiles to be considered as free space between elements = 2,
    variableTilesPercentage: {type: 'float'}, // percentage of ground tiles to be changed by rando values from the randomGroundTiles property = 15,
    pathTile: {type: 'int'}, // tile index from the tile set used to create the paths = 121,
    collisionLayersForPaths: {type: 'array', valuesType: 'string'}, // array of collision layers to be avoided by the paths = ['change-points', 'collisions', 'tree-base'],
    randomGroundTiles: {type: 'array', valuesType: 'int'}, // array of tile indexes from the tile set used to create the ground variations = [26, 27, 28],
    surroundingTiles: {
        type: 'object',
        nested: {
            '-1,-1': {type: 'int'}, // tile index from the tile set used in the top-left surrounding = 127,
            '-1,0': {type: 'int'}, // tile index from the tile set used in the top-center surrounding= 124,
            '-1,1': {type: 'int'}, // tile index from the tile set used in the top-right surrounding = 130,
            '0,-1': {type: 'int'}, // tile index from the tile set used in the middle-left surrounding = 126,
            '0,1': {type: 'int'}, // tile index from the tile set used in the middle-right surrounding = 129,
            '1,-1': {type: 'int'}, // tile index from the tile set used in the bottom-left surrounding = 132,
            '1,0': {type: 'int'}, // tile index from the tile set used in the bottom-center surrounding = 131,
            '1,1': {type: 'int'}, // tile index from the tile set used in the bottom-right surrounding = 133,
        }
    },
    corners: {
        type: 'object',
        nested: {
            '-1,-1': {type: 'int'}, // tile index from the tile set used in the top-left corner = 285,
            '-1,1': {type: 'int'}, // tile index from the tile set used in the top-right corner = 284,
            '1,-1': {type: 'int'}, // tile index from the tile set used in the bottom-left corner = 283,
            '1,1': {type: 'int'}, // tile index from the tile set used in the bottom-right corner = 282,
        }
    }
};
