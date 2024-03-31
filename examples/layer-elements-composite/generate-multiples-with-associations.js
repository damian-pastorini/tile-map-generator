/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const { AssociatedMaps } = require('../../lib/generator/associated-maps');
const tileMapJSON = require('./reldens-town-composite-with-associations.json');
const rootFolder = __dirname;

const execute = async () => {
    let generators = {};
    let generatedMaps = {};
    let mapNames = ['town-001', 'town-002', 'town-003', 'town-004'];
    let i = 0;
    for(let mapFileName of mapNames){
        let previousGenerator = 0 < i ? generators[mapNames[i - 1]] : null;
        let previousMainPath = [];
        if (previousGenerator) {
            previousMainPath = !previousGenerator.hasAssociatedMap ? previousGenerator.generatedMainPathIndexes : [];
        }
        let generationOptions = {
            // @NOTE: this could be replaced by sc.deepJsonClone(tileMapJSON), but I wanted to show that it must be
            // a deep copy, otherwise the original object would be modified.
            tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
            mapFileName,
            rootFolder,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions'],
            previousMainPath,
            expandElementsSize: 1
        };
        generators[mapFileName] = new RandomMapGenerator();
        await generators[mapFileName].fromElementsProvider(generationOptions);
        generatedMaps[mapFileName] = await generators[mapFileName].generate();
        let associatedMaps = new AssociatedMaps();
        await associatedMaps.generate(
            generatedMaps[mapFileName],
            mapFileName,
            rootFolder,
            {
                generateElementsPath: false,
                blockMapBorder: true,
                freeSpaceTilesQuantity: 0,
                variableTilesPercentage: 0,
                placeElementsOrder: 'inOrder', // this will place the elements in the first available position
                orderElementsBySize: false, // this will order the elements by size
                randomizeQuantities: true, // when ordering the elements by size we need to set this "false"
                applySurroundingPathTiles: false
            },
            generators[mapFileName]
        );
        i++;
    }
};

execute();
