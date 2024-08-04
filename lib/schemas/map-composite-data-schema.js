/**
 *
 * Reldens - Tile Map Generator - MapCompositeDataSchema
 *
 * Schema data:
 *
 * factor 'int' = 2
 * - size multiplier
 *
 * mainPathSize 'int' = 3,
 * - number of tiles to be occupied by the main path starting point
 *
 * blockMapBorder 'boolean' = true,
 *
 * freeSpaceTilesQuantity 'int' = 2,
 * - number of tiles to be considered as free space between elements
 *
 * variableTilesPercentage 'number' = 15
 * - percentage of ground tiles to be changed by rando values from the randomGroundTiles property
 *
 * collisionLayersForPaths 'array', valuesType: 'string' = ['change-points', 'collisions', 'tree-base']
 * - array of collision layers to be avoided by the paths
 *
 */

module.exports.MapCompositeDataSchema = {
    factor: {type: 'int'},
    mainPathSize: {type: 'int'},
    blockMapBorder: {type: 'boolean'},
    freeSpaceTilesQuantity: {type: 'int'},
    variableTilesPercentage: {type: 'number'},
    collisionLayersForPaths: {type: 'array', valuesType: 'string'},
};
