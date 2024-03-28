/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const tileMapJSON = require('./reldens-town-composite-with-associations.json');
const rootFolder = __dirname;

const execute = async () => {
    let generators = {};
    let generatedMaps = {};
    let mapNames = ['map-associations-001', 'map-associations-002', 'map-associations-003'];
    let i = 0;
    for(let mapFileName of mapNames){
        let previousGenerator = 0 < i ? generators[mapNames[i - 1]] : null;
        let previousMainPath = [];
        if (previousGenerator) {
            previousMainPath = !previousGenerator.hasAssociatedMap ? previousGenerator.generatedMainPathIndexes : [];
        }
        let generationOptions = {
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            mapFileName,
            rootFolder,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions'],
            // writeCroppedElementsFiles: true,
            previousMainPath,
            associatedMapsConfig: {
                generateElementsPath: false,
                blockMapBorder: true,
                freeSpaceTilesQuantity: 1,
                variableTilesPercentage: 0,
                placeElementsOrder: 'inOrder', // this will place the elements one beside the other in the generated map
                orderElementsBySize: true, // this will order the elements by size
                randomizeQuantities: false, // when ordering the elements by size we need to set this "false"
                applySurroundingPathTiles: false
                // writeCroppedElementsFiles: true
            }
        };
        generators[mapFileName] = await RandomMapGenerator.fromComposite(generationOptions);
        generatedMaps[mapFileName] = await generators[mapFileName].generate();
        i++;
    }
};

execute();
