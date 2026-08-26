/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const { AssociatedMaps } = require('../../lib/generator/associated-maps');
const tileMapJSON = require('./reldens-town-composite-with-associations.json');

class GenerateMultiplesWithAssociations
{

    constructor()
    {
        this.generators = {};
        this.associatedMaps = {};
        this.generatedMaps = {};
    }

    async execute()
    {
        let mapsInformation = [
            {mapName: 'town-001', mapTitle: 'Town 1'},
            {mapName: 'town-002', mapTitle: 'Town 2'},
            {mapName: 'town-003', mapTitle: 'Town 3'},
            {mapName: 'town-004', mapTitle: 'Town 4'}
        ];
        let i = 0;
        for(let mapInformation of mapsInformation){
            let {mapName, mapTitle} = mapInformation;
            let previousGenerator = 0 < i ? this.generators[mapsInformation[i - 1]] : null;
            let previousMainPath = [];
            if (previousGenerator) {
                previousMainPath = !previousGenerator.hasAssociatedMap
                    ? previousGenerator.generatedMainPathIndexes
                    : [];
            }
            let generationOptions = {
                // @NOTE: this could be replaced by sc.deepJsonClone(tileMapJSON), but I wanted to show that it must be
                // a deep copy, otherwise the original object would be modified.
                tileMapJSON: JSON.parse(JSON.stringify(tileMapJSON)),
                mapName,
                rootFolder: __dirname,
                factor: 2,
                mainPathSize: 3,
                blockMapBorder: true,
                freeSpaceTilesQuantity: 1,
                minimumElementsFreeSpaceAround: 1,
                freeTilesMultiplier: 4,
                variableTilesPercentage: 15,
                collisionLayersForPaths: ['change-points', 'collisions'],
                previousMainPath,
                expandElementsSize: 1
            };
            this.generators[mapName] = new RandomMapGenerator();
            this.generators[mapName].addMapProperty('mapTitle', 'string', mapTitle);
            await this.generators[mapName].fromElementsProvider(generationOptions);
            this.generatedMaps[mapName] = await this.generators[mapName].generate();
            this.associatedMaps[mapName] = new AssociatedMaps();
            await this.associatedMaps[mapName].generate(
                this.generatedMaps[mapName],
                mapName,
                __dirname,
                {
                    generateElementsPath: false,
                    blockMapBorder: true,
                    freeSpaceTilesQuantity: 1,
                    variableTilesPercentage: 0,
                    minimumElementsFreeSpaceAround: 0,
                    minimumDistanceFromBorders: 0,
                    placeElementsOrder: 'inOrder', // this will place the elements in the first available position
                    orderElementsBySize: false, // this will order the elements by size
                    randomizeQuantities: true, // when ordering the elements by size we need to set this "false"
                    applySurroundingPathTiles: false
                },
                this.generators[mapName]
            );
            i++;
        }
        return this.generators;
    }

}

if(require.main === module){
    (new GenerateMultiplesWithAssociations()).execute();
}

module.exports.GenerateMultiplesWithAssociations = GenerateMultiplesWithAssociations;
