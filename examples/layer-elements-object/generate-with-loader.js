/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsObjectLoader } = require('../../lib/loader/layer-elements-object-loader');
const { RandomMapGenerator } = require('../../lib/random-map-generator');

let execute = async () => {
    let loader = new LayerElementsObjectLoader({
        rootFolder: __dirname,
        mapDataFile: 'map-data.json'
    });
    await loader.load();
    let generator = new RandomMapGenerator(loader.mapData);
    return await generator.generate();
};

execute();
