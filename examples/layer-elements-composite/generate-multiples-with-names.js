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
    for(let mapName of ['map-001', 'map-002', 'map-003']){
        generators[mapName] = new RandomMapGenerator();
        await generators[mapName].fromElementsProvider({
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            debugPathsGrid: false,
            mapName,
            rootFolder,
            factor: 2,
            mainPathSize: 3,
            pathSize: 2,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 5,
            minimumElementsFreeSpaceAround: 1,
            freeTilesMultiplier: 2,
            collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
            autoMergeLayersByKeys: ['base-merge-tree', 'change-points', 'merge-level-1'],
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
                    variableTilesPercentage: 10,
                },
                riverFull: {
                    layerName: 'river-area-full',
                    tilesKey: 'river',
                    width: 10,
                    height: 10,
                    markPercentage: 30,
                    isElement: true,
                    walkable: false,
                    applyCornersTiles: true,
                    freeSpaceAround: 2,
                    allowPathsInFreeSpace: false,
                    variableTilesPercentage: 20
                }
            }
        });
        await generators[mapName].generate();
    }
};

execute();
