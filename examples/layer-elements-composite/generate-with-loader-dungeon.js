/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsCompositeLoader } = require('../../lib/loader/layer-elements-composite-loader');
const { RandomMapGenerator } = require('../../lib/random-map-generator');

class GenerateWithLoaderDungeon
{

    constructor()
    {
        this.generators = {};
    }

    async execute()
    {
        let loader = new LayerElementsCompositeLoader({
            rootFolder: __dirname,
            mapDataFile: 'map-composite-data-dungeon.json'
        });
        await loader.load();
        let generator = new RandomMapGenerator();
        await generator.fromElementsProvider(loader.mapData);
        this.generators[generator.mapName] = generator;
        await generator.generate();
        return this.generators;
    }

}

if(require.main === module){
    (new GenerateWithLoaderDungeon()).execute();
}

module.exports.GenerateWithLoaderDungeon = GenerateWithLoaderDungeon;
