/**
 *
 * Reldens - Tile Map Generator - MapCompositeDataSchema
 *
 */

module.exports.MapCompositeDataSchema = {
    factor: {type: 'int'}, // size multiplier = 2
    mainPathSize: {type: 'int'}, // number of tiles to be occupied by the main path starting point = 3,
    blockMapBorder: {type: 'boolean'}, // true,
    freeSpaceTilesQuantity: {type: 'int'}, // number of tiles to be considered as free space between elements = 2,
    variableTilesPercentage: {type: 'float'}, // percentage of ground tiles to be changed by rando values from the randomGroundTiles property = 15,
    collisionLayersForPaths: {type: 'array', valuesType: 'string'}, // array of collision layers to be avoided by the paths = ['change-points', 'collisions', 'tree-base'],
};
