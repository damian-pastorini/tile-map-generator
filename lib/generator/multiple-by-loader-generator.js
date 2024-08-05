/**
 *
 * Reldens - Tile Map Generator - MultipleByLoaderGenerator
 *
 */

const { LayerElementsCompositeLoader } = require('../loader/layer-elements-composite-loader');
const { RandomMapGenerator } = require('../random-map-generator');
const { Logger, sc } = require('@reldens/utils');

class MultipleByLoaderGenerator
{

    constructor(props)
    {
        this.loaderData = props.loaderData;
        this.loader = {};
        this.generators = {};
        this.generatedMaps = {};
    }

    async generate()
    {
        if(!this.loaderData){
            Logger.error('Loader data is not defined.');
            return false;
        }
        this.loader = new LayerElementsCompositeLoader(this.loaderData);
        await this.loader.load();
        if(!sc.isArray(this.loader.mapData.mapNames) || 0 === this.loader.mapData.mapNames.length){
            Logger.error('Names are not defined.');
            return false;
        }
        for(let mapName of this.loader.mapData.mapNames){
            this.generators[mapName] = new RandomMapGenerator();
            let mapData = sc.deepJsonClone(this.loader.mapData);
            mapData.mapName = mapName;
            await this.generators[mapName].fromElementsProvider(mapData);
            this.generatedMaps[mapName] = await this.generators[mapName].generate();
        }
        return this.generators;
    }

}

module.exports.MultipleByLoaderGenerator = MultipleByLoaderGenerator;
