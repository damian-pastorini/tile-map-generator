/**
 *
 * Reldens - Tile Map Generator - MultipleWithAssociationsByLoaderGenerator
 *
 */

const { LayerElementsCompositeLoader } = require('../loader/layer-elements-composite-loader');
const { RandomMapGenerator } = require('../random-map-generator');
const { AssociatedMaps } = require('./associated-maps');
const { Logger, sc } = require('@reldens/utils');

class MultipleWithAssociationsByLoaderGenerator
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
        let mapsInformation = this.loader.mapData?.mapsInformation;
        if(!sc.isArray(mapsInformation) || 0 === mapsInformation.length){
            Logger.error('Names are not defined.');
            return false;
        }
        let generators = {};
        let generatedMaps = {};
        let i = 0;
        for(let mapInformation of mapsInformation){
            let {mapName, mapTitle} = mapInformation;
            let previousGenerator = 0 < i ? generators[mapsInformation[i - 1]] : null;
            let previousMainPath = [];
            if (previousGenerator) {
                previousMainPath = !previousGenerator.hasAssociatedMap ? previousGenerator.generatedMainPathIndexes : [];
            }
            generators[mapName] = new RandomMapGenerator();
            let mapData = sc.deepJsonClone(this.loader.mapData);
            mapData.mapName = mapName;
            mapData.previousMainPath = previousMainPath;
            generators[mapName].addMapProperty('mapTitle', 'string', mapTitle);
            await generators[mapName].fromElementsProvider(mapData);
            generatedMaps[mapName] = await generators[mapName].generate();
            let associatedMaps = new AssociatedMaps();
            await associatedMaps.generate(
                generatedMaps[mapName],
                mapName,
                this.loader.rootFolder,
                sc.get(this.loader.mapData, 'associationsProperties', {}),
                generators[mapName]
            );
            i++;
        }
    }

}

module.exports.MultipleWithAssociationsByLoaderGenerator = MultipleWithAssociationsByLoaderGenerator;
