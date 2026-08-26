/**
 *
 * Reldens - Tile Map Generator - Example
 *
 */

const { MultipleByLoaderGenerator } = require('../../lib/generator/multiple-by-loader-generator');

class GenerateWithLoaderMultiplesWithNames
{

    constructor()
    {
        this.generators = {};
    }

    async execute()
    {
        let generator = new MultipleByLoaderGenerator({
            loaderData: {
                rootFolder: __dirname,
                mapDataFile: 'map-composite-data-with-names.json'
            }
        });
        await generator.generate();
        this.generators = generator.generators;
        return this.generators;
    }

}

if(require.main === module){
    (new GenerateWithLoaderMultiplesWithNames()).execute();
}

module.exports.GenerateWithLoaderMultiplesWithNames = GenerateWithLoaderMultiplesWithNames;
