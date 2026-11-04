/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { MultipleWithAssociationsByLoaderGenerator } = require(
    '../../lib/generator/multiple-with-associations-by-loader-generator'
);

class GenerateWithLoaderMultiplesWithAssociations
{

    constructor()
    {
        this.generators = {};
        this.associatedMaps = {};
    }

    async execute()
    {
        let generator = new MultipleWithAssociationsByLoaderGenerator({
            loaderData: {
                rootFolder: __dirname,
                mapDataFile: 'map-composite-data-with-associations.json'
            }
        });
        await generator.generate();
        this.generators = generator.generators;
        this.associatedMaps = generator.associatedMaps;
        return this.generators;
    }

}

if(require.main === module){
    (new GenerateWithLoaderMultiplesWithAssociations()).execute();
}

module.exports.GenerateWithLoaderMultiplesWithAssociations = GenerateWithLoaderMultiplesWithAssociations;
