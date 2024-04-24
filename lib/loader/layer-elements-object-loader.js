/**
 *
 * Reldens - Tile Map Generator - LayerElementsObjectLoader
 *
 */

const { MapDataSchema } = require('../../lib/schemas/map-data-schema');
const { RandomMapGenerator } = require('../../lib/random-map-generator');
const { FileHandler } = require('../../lib/files/file-handler');
const { SchemaValidator, Logger, sc } = require('@reldens/utils');

class LayerElementsObjectLoader
{

    constructor(props)
    {
        this.fileHandler = new FileHandler();
        this.layerElementsFiles = props.layerElementsFiles;
        this.mapDataFile = props.mapDataFile;
        this.rootFolder = props.rootFolder;
        this.layerElements = sc.get(props, 'layerElements', false);
        this.mapData = sc.get(props, 'mapData', false);
        this.schemaValidator = new SchemaValidator(MapDataSchema);
    }

    async execute()
    {
        if(!this.rootFolder){
            Logger.error('Root folder is not defined.');
            return false;
        }
        if(!this.layerElements){
            this.layerElements = this.loadLayerElements();
            if(!this.layerElements){
                return false;
            }
        }
        if(!this.mapData){
            this.mapData = this.loadMapData();
        }
        if(this.schemaValidator.validate(this.mapData)){
            return false;
        }
        this.mapData.rootFolder = this.rootFolder;
        this.mapData.layerElements = this.layerElements;
        const generator = new RandomMapGenerator(this.mapData);
        return await generator.generate();
    }

    loadLayerElements()
    {
        if(!this.layerElementsFiles){
            Logger.error('Layer elements files are not defined.');
            return false;
        }
        let layerElements = {};
        for(let i of Object.keys(this.layerElementsFiles)){
            let layerJson = this.fetchLayersJsonFromMapFile(this.layerElementsFiles[i]);
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
        if (!layersJson){
            Logger.error('Layer elements file is not valid, layers data not found.', mapFile, mapFileJson);
            return false;
        }
        return layersJson;
    }

    loadMapData()
    {
        if(!this.mapDataFile){
            Logger.error('Map data file is not defined.');
            return false;
        }
        let mapData = this.loadJsonFromFile(this.mapDataFile);
        if (!mapData){
            Logger.error('Map data file is not valid.', this.mapDataFile, mapData);
            return false;
        }
        return mapData;
    }

    loadJsonFromFile(fileName)
    {
        let filePath = this.fileHandler.joinPaths(this.rootFolder, fileName);
        if (!this.fileHandler.exists(filePath)){
            Logger.error('File not found: ' + filePath);
            return false;
        }
        let fileContents = this.fileHandler.readFile(filePath);
        if (!fileContents){
            Logger.error('File cannot be read: '+filePath);
            return false;
        }
        return sc.parseJson(fileContents);
    }

}

module.exports.LayerElementsObjectLoader = LayerElementsObjectLoader;
