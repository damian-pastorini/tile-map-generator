/**
 *
 * Reldens - Tile Map Generator - LayerElementsLoader
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class LayerElementsLoader
{

    constructor(props)
    {
        this.mapDataFile = props.mapDataFile;
        this.rootFolder = props.rootFolder;
        this.generatedFolder = sc.get(props, 'generatedFolder', false);
        this.mapData = sc.get(props, 'mapData', false);
        this.schemaValidator = false;
    }

    async load()
    {
        if(!this.rootFolder){
            Logger.error('Root folder is not defined.');
            return false;
        }
        if(!this.mapData){
            this.mapData = this.loadMapData();
        }
        if(!this.loadPayload()){
            return false;
        }
        if(!this.schemaValidator.validate(this.mapData)){
            return false;
        }
        if(this.generatedFolder){
            this.mapData.generatedFolder = this.generatedFolder;
        }
        this.mapData.rootFolder = this.rootFolder;
        this.assignPayload();
        return true;
    }

    loadPayload()
    {
        return true;
    }

    assignPayload()
    {
    }

    loadMapData()
    {
        if(!this.mapDataFile){
            Logger.error('Map data file is not defined.');
            return false;
        }
        let mapData = this.loadJsonFromFile(this.mapDataFile);
        if(!mapData){
            Logger.error('Map data file is not valid.', this.mapDataFile, mapData);
            return false;
        }
        return mapData;
    }

    loadJsonFromFile(fileName)
    {
        if(!fileName){
            Logger.error('File name is not defined.');
            return false;
        }
        let filePath = FileHandler.joinPaths(this.rootFolder, fileName);
        let fileJson = FileHandler.fetchFileJson(filePath);
        if(!fileJson){
            Logger.error('File could not be loaded.', filePath, this.rootFolder, fileName);
            return false;
        }
        return fileJson;
    }

}

module.exports.LayerElementsLoader = LayerElementsLoader;
