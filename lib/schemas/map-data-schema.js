/**
 *
 * Reldens - Tile Map Generator - MapDataSchema
 *
 * Schema data:
 *
 * tileSize 'int' = 32
 * - size in pixels
 *
 * tileSheetPath 'string' = 'tilesheet.png'
 *
 * tileSheetName 'string' = 'tilesheet.png'
 *
 * imageHeight 'int' = 578
 * - size in pixels
 *
 * imageWidth 'int' = 612
 * - size in pixels
 *
 * tileCount 'int' = 306
 * - number of tiles
 *
 * columns 'int' = 18
 *
 * margin 'int' = 1
 *
 * spacing 'int' = 2
 *
 * elementsQuantity 'object'
 *
 * groundTile 'int' = 116
 * - tile index from the tile set used for the ground
 *
 * mainPathSize 'int' = 3
 * - number of tiles to be occupied by the main path starting point
 *
 * blockMapBorder 'boolean' = true
 *
 * freeSpaceTilesQuantity 'int' = 2
 * - number of tiles to be considered as free space between elements
 *
 * variableTilesPercentage 'number' = 15.5
 * - percentage of ground tiles to be changed by rando values from the randomGroundTiles property
 *
 * pathTile 'int' = 121
 * - tile index from the tile set used to create the paths
 *
 * collisionLayersForPaths 'array', valuesType: 'string' = ['change-points', 'collisions', 'tree-base']
 * - array of collision layers to be avoided by the paths
 *
 * randomGroundTiles 'array', valuesType: 'int' = [26, 27, 28]
 * - array of tile indexes from the tile set used to create the ground variations
 *
 * surroundingTiles: {
 *     type: 'object',
 *     nested: {
 *         '-1,-1' 'int' = 127 // tile index from the tile set used in the top-left surrounding
 *         '-1,0' 'int' = 124 // tile index from the tile set used in the top-center surrounding
 *         '-1,1' 'int' = 130 // tile index from the tile set used in the top-right surrounding
 *         '0,-1' 'int' = 126 // tile index from the tile set used in the middle-left surrounding
 *         '0,1' 'int'= 129 // tile index from the tile set used in the middle-right surrounding
 *         '1,-1' 'int' = 132 // tile index from the tile set used in the bottom-left surrounding
 *         '1,0' 'int' = 131 // tile index from the tile set used in the bottom-center surrounding
 *         '1,1' 'int' = 133 // tile index from the tile set used in the bottom-right surrounding
 *     }
 * },
 * corners: {
 *     type: 'object',
 *     nested: {
 *         '-1,-1' 'int' = 285 // tile index from the tile set used in the top-left corner
 *         '-1,1' 'int' = 284 // tile index from the tile set used in the top-right corner
 *         '1,-1' 'int' = 283 // tile index from the tile set used in the bottom-left corner
 *         '1,1' 'int' = 282 // tile index from the tile set used in the bottom-right corner
 *     }
 * }
 *
 */

module.exports.MapDataSchema = {
    tileSize: {type: 'int'},
    tileSheetPath: {type: 'string'},
    tileSheetName: {type: 'string'},
    imageHeight: {type: 'int'},
    imageWidth: {type: 'int'},
    tileCount: {type: 'int'},
    columns: {type: 'int'},
    margin: {type: 'int'},
    spacing: {type: 'int'},
    elementsQuantity: {type: 'object'},
    groundTile: {type: 'int'},
    mainPathSize: {type: 'int'},
    blockMapBorder: {type: 'boolean'},
    freeSpaceTilesQuantity: {type: 'int'},
    variableTilesPercentage: {type: 'number'},
    pathTile: {type: 'int'},
    collisionLayersForPaths: {type: 'array', valuesType: 'string'},
    randomGroundTiles: {type: 'array', valuesType: 'int'},
    surroundingTiles: {
        type: 'object',
        nested: {
            '-1,-1': {type: 'int'},
            '-1,0': {type: 'int'},
            '-1,1': {type: 'int'},
            '0,-1': {type: 'int'},
            '0,1': {type: 'int'},
            '1,-1': {type: 'int'},
            '1,0': {type: 'int'},
            '1,1': {type: 'int'},
        }
    },
    corners: {
        type: 'object',
        nested: {
            '-1,-1': {type: 'int'},
            '-1,1': {type: 'int'},
            '1,-1': {type: 'int'},
            '1,1': {type: 'int'},
        }
    }
};
