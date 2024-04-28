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
            mapDataFile: 'map-composite-data-with-names.json'
        }
    });
    await generator.generate();
};

execute();
