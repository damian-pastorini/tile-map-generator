/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const tileMapJSON = require('./reldens-town-composite.json');
const rootFolder = __dirname;

const execute = async () => {
    let generators = {};
    for(let mapFileName of ['map-001', 'map-002', 'map-003']){
        generators[mapFileName] = await RandomMapGenerator.fromComposite({
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            mapFileName,
            rootFolder,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions', 'tree-base']
        });
        await generators[mapFileName].generate();
    }
};

execute();
