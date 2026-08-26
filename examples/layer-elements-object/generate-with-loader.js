/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsObjectLoader } = require('../../lib/loader/layer-elements-object-loader');
const { RandomMapGenerator } = require('../../lib/random-map-generator');

class GenerateWithLoader
{

    constructor()
    {
        this.generators = {};
    }

    async execute()
    {
        let loader = new LayerElementsObjectLoader({
            rootFolder: __dirname,
            mapDataFile: 'map-data.json'
        });
        await loader.load();
        let generator = new RandomMapGenerator(loader.mapData);
        this.generators[generator.mapName] = generator;
        await generator.generate();
        return this.generators;
    }

}

if(require.main === module){
    (new GenerateWithLoader()).execute();
}

module.exports.GenerateWithLoader = GenerateWithLoader;
