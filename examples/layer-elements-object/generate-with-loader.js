/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsObjectLoader } = require('../../lib/loader/layer-elements-object-loader');
const { RandomMapGenerator } = require('../../lib/random-map-generator');

const execute = async () => {
    const loader = new LayerElementsObjectLoader({
        rootFolder: __dirname,
        mapDataFile: 'map-data.json',
        layerElementsFiles: {
            house1: 'house-001.json',
            house2: 'house-002.json',
            tree: 'tree.json'
        }
    });
    await loader.load();
    const generator = new RandomMapGenerator(loader.mapData);
    return await generator.generate();
};

execute();
