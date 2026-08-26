/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { RandomMapGenerator} = require('../../lib/random-map-generator');
const tileMapJSON = require('./reldens-town-composite.json');

class Generate
{

    constructor()
    {
        this.generators = {};
    }

    async execute()
    {
        let generator = new RandomMapGenerator();
        await generator.fromElementsProvider({
            tileMapJSON,
            rootFolder: __dirname,
            factor: 2,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 1,
            minimumElementsFreeSpaceAround: 1,
            freeTilesMultiplier: 4,
            variableTilesPercentage: 15,
            collisionLayersForPaths: ['change-points', 'collisions', 'tree-base']
        });
        this.generators[generator.mapName] = generator;
        await generator.generate();
        return this.generators;
    }

}

if(require.main === module){
    (new Generate()).execute();
}

module.exports.Generate = Generate;
