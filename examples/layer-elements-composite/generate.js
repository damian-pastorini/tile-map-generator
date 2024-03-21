/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const tileMapJSON = require('./reldens-town-composite.json');
const rootFolder = __dirname;

const execute = async () => {
    const generator = await RandomMapGenerator.fromComposite({
        tileMapJSON,
        rootFolder,
        mainPathSize: 3,
        blockMapBorder: true,
        freeSpaceTilesQuantity: 2,
        variableTilesPercentage: 15,
        collisionLayersForPaths: ['change-points', 'collisions', 'tree-base']
    });
    await generator.generate();
};

execute();
