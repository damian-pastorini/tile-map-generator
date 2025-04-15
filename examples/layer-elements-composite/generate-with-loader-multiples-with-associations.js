/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { MultipleWithAssociationsByLoaderGenerator } = require(
    '../../lib/generator/multiple-with-associations-by-loader-generator'
);

let execute = async () => {
    let generator = new MultipleWithAssociationsByLoaderGenerator({
        loaderData: {
            rootFolder: __dirname,
            mapDataFile: 'map-composite-data-with-associations.json'
        }
    });
    await generator.generate();
};

execute();
