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
        let generators = {};
        for(let mapName of this.loader.mapData.mapNames){
            generators[mapName] = new RandomMapGenerator();
            let mapData = sc.deepJsonClone(this.loader.mapData);
            mapData.mapName = mapName;
            await generators[mapName].fromElementsProvider(mapData);
            await generators[mapName].generate();
        }
    }

}

module.exports.MultipleByLoaderGenerator = MultipleByLoaderGenerator;
