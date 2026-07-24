/**
 *
 * Reldens - Tile Map Generator - LayerElementsObjectLoader
 *
 */

const { LayerElementsLoader } = require('./layer-elements-loader');
const { MapDataSchema } = require('../../lib/schemas/map-data-schema');
const { SchemaValidator, Logger, sc } = require('@reldens/utils');

class LayerElementsObjectLoader extends LayerElementsLoader
{

    constructor(props)
    {
        super(props);
        this.layerElements = sc.get(props, 'layerElements', false);
        this.schemaValidator = new SchemaValidator(MapDataSchema);
    }

    loadPayload()
    {
        if(!this.layerElements){
            this.layerElements = this.loadLayerElements();
            if(!this.layerElements){
                return false;
            }
        }
        return true;
    }

    assignPayload()
    {
        this.mapData.layerElements = this.layerElements;
    }

    loadLayerElements()
    {
        let layerElementsFiles = sc.get(this.mapData, 'layerElementsFiles', false);
        if(!layerElementsFiles){
            Logger.error('Layer elements files are not defined.');
            return false;
        }
        let layerElements = {};
        for(let i of Object.keys(layerElementsFiles)){
            let layerJson = this.fetchLayersJsonFromMapFile(layerElementsFiles[i]);
            if(!layerJson){
                continue;
            }
            layerElements[i] = layerJson;
        }
        return layerElements;
    }

    fetchLayersJsonFromMapFile(mapFile)
    {
        let mapFileJson = this.loadJsonFromFile(mapFile);
        let layersJson = sc.get(mapFileJson, 'layers', false);
        if(!layersJson){
            Logger.error('Layer elements file is not valid, layers data not found.', mapFile, mapFileJson);
            return false;
        }
        return layersJson;
    }

}

module.exports.LayerElementsObjectLoader = LayerElementsObjectLoader;
