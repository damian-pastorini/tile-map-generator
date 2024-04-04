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
    let mapsInformation = [
        {mapFileName: 'town-001', mapTitle: 'Town 1'},
        {mapFileName: 'town-002', mapTitle: 'Town 2'},
        {mapFileName: 'town-003', mapTitle: 'Town 3'},
        {mapFileName: 'town-004', mapTitle: 'Town 4'},
    ];
    let i = 0;
    for(let mapInformation of mapsInformation){
        let {mapFileName, mapTitle} = mapInformation;
        let previousGenerator = 0 < i ? generators[mapsInformation[i - 1]] : null;
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
            factor: 2,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions'],
            previousMainPath,
            expandElementsSize: 1
        };
        generators[mapFileName] = new RandomMapGenerator();
        generators[mapFileName].addMapProperty('mapTitle', 'string', mapTitle);
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
