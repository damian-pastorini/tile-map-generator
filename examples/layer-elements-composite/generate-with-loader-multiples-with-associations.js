/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { MultipleWithAssociationsByLoaderGenerator } = require(
    '../../lib/generator/multiple-with-associations-by-loader-generator'
);

const execute = async () => {
    let generator = new MultipleWithAssociationsByLoaderGenerator({
        loaderData: {
            rootFolder: __dirname,
            mapDataFile: 'map-composite-data-with-associations.json',
            compositeElementsFile: 'reldens-town-composite-with-associations.json'
        }
    });
    await generator.generate();
};

execute();
