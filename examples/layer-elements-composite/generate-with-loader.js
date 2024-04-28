/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsCompositeLoader } = require('../../lib/loader/layer-elements-composite-loader');
const { RandomMapGenerator } = require('../../lib/random-map-generator');

const execute = async () => {
    let loader = new LayerElementsCompositeLoader({
        rootFolder: __dirname,
        mapDataFile: 'map-composite-data.json'
    });
    await loader.load();
    const generator = new RandomMapGenerator();
    await generator.fromElementsProvider(loader.mapData);
    return await generator.generate();
};

execute();
