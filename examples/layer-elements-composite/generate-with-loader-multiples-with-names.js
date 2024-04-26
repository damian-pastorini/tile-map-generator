/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { MultipleByLoaderGenerator } = require('../../lib/generator/multiple-by-loader-generator');

const execute = async () => {
    let generator = new MultipleByLoaderGenerator({
        loaderData: {
            rootFolder: __dirname,
            mapDataFile: 'map-composite-data-with-names.json',
            compositeElementsFile: 'reldens-town-composite.json'
        }
    });
    await generator.generate();
};

execute();
