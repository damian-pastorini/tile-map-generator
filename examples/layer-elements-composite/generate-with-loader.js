/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { LayerElementsCompositeLoader } = require('../../lib/loader/layer-elements-composite-loader');

const execute = async () => {
    let generator = new LayerElementsCompositeLoader({
        rootFolder: __dirname,
        mapDataFile: 'map-composite-data.json',
        compositeElementsFile: 'reldens-town-composite.json'
    });
    await generator.execute();
};

execute();
