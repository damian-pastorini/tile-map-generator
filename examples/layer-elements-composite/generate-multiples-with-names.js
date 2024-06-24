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
        generators[mapFileName] = new RandomMapGenerator();
        await generators[mapFileName].fromElementsProvider({
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            mapFileName,
            rootFolder,
            factor: 2,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
            groundSpots: {
                respawnPunchTrees: {
                    layerName: 'respawn-area-monsters-lvl-1-2',
                    width: 8,
                    height: 6,
                    quantity: 3,
                    mapSpace: 'add',
                    blockSpace: true,
                    walkable: true
                },
                forest: {
                    layerName: 'forest-collisions',
                    width: 4,
                    height: 6,
                    mapSpace: 'use',
                    blockSpace: true,
                    walkable: false,
                    applyCornersTiles: true
                }
            }
        });
        await generators[mapFileName].generate();
    }
};

execute();
