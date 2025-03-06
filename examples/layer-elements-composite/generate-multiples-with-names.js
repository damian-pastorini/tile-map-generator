/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const tileMapJSON = require('./reldens-town-composite.json');
const rootFolder = __dirname;

let execute = async () => {
    let generators = {};
    for(let mapName of ['map-001']){ // , 'map-002', 'map-003'
        generators[mapName] = new RandomMapGenerator();
        await generators[mapName].fromElementsProvider({
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            debugPathsGrid: true,
            mapName,
            rootFolder,
            factor: 2,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 5,
            collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
            groundSpots: {
                respawnPunchTrees: {
                    layerName: 'respawn-area-monsters-lvl-1-2',
                    width: 50,
                    height: 50,
                    markPercentage: 50,
                    quantity: 3,
                    walkable: true
                },
                river: {
                    layerName: 'river-area',
                    width: 20,
                    height: 20,
                    markPercentage: 50,
                    isElement: true,
                    walkable: false,
                    applyCornersTiles: true,
                    freeSpaceAround: 1,
                    allowPathsInFreeSpace: false,
                },
                riverFull: {
                    layerName: 'river-area-full',
                    surroundingTilesPrefix: 'river',
                    width: 10,
                    height: 10,
                    markPercentage: 20,
                    isElement: true,
                    walkable: false,
                    applyCornersTiles: true,
                    freeSpaceAround: 2,
                    allowPathsInFreeSpace: false,
                }
            }
        });
        await generators[mapName].generate();
    }
};

execute();
