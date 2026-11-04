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
        this.generators = {};
        this.generatedMaps = {};
        this.associatedMaps = {};
    }

    async generate()
    {
        if(!this.loaderData){
            Logger.error('Loader data is not defined.');
            return false;
        }
        this.loader = new LayerElementsCompositeLoader(this.loaderData);
        if(false === await this.loader.load()){
            return false;
        }
        let mapsInformation = this.loader.mapData?.mapsInformation;
        if(!sc.isArray(mapsInformation) || 0 === mapsInformation.length){
            Logger.error('Names are not defined.');
            return false;
        }
        let chainMainPaths = sc.get(this.loader.mapData, 'chainMainPaths', false);
        let i = 0;
        for(let mapInformation of mapsInformation){
            let {mapName, mapTitle} = mapInformation;
            let previousGenerator = 0 < i ? this.generators[mapsInformation[i - 1].mapName] : null;
            this.generators[mapName] = new RandomMapGenerator();
            let mapData = sc.deepJsonClone(this.loader.mapData);
            mapData.mapName = mapName;
            Object.assign(mapData, this.providePreviousMapData(previousGenerator, chainMainPaths));
            if(chainMainPaths){
                mapData.nextMapName = sc.get(mapsInformation[i + 1], 'mapName', '');
            }
            this.generators[mapName].addMapProperty('mapTitle', 'string', mapTitle);
            await this.generators[mapName].fromElementsProvider(mapData);
            this.generatedMaps[mapName] = await this.generators[mapName].generate();
            this.associatedMaps[mapName] = new AssociatedMaps();
            await this.associatedMaps[mapName].generate(
                this.generatedMaps[mapName],
                mapName,
                this.loader.rootFolder,
                sc.get(this.loader.mapData, 'associationsProperties', {}),
                this.generators[mapName]
            );
            i++;
        }
    }

    providePreviousMapData(previousGenerator, chainMainPaths)
    {
        if(!previousGenerator){
            return {previousMainPath: []};
        }
        let previousMapSize = {mapWidth: previousGenerator.mapWidth, mapHeight: previousGenerator.mapHeight};
        if(chainMainPaths){
            return {
                previousMainPath: previousGenerator.generatedExitMainPathIndexes,
                previousMapSize,
                previousMapName: previousGenerator.mapName
            };
        }
        return {
            previousMainPath: previousGenerator.hasAssociatedMap ? [] : previousGenerator.generatedMainPathIndexes,
            previousMapSize
        };
    }

}

module.exports.MultipleWithAssociationsByLoaderGenerator = MultipleWithAssociationsByLoaderGenerator;
