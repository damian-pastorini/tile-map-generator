/**
 *
 * Reldens - Tile Map Generator - LayerElementsCompositeLoader
 *
 */

const { MapCompositeDataSchema } = require('../../lib/schemas/map-composite-data-schema');
const { RandomMapGenerator } = require('../../lib/random-map-generator');
const { FileHandler } = require('../../lib/files/file-handler');
const { SchemaValidator, Logger, sc } = require('@reldens/utils');

class LayerElementsCompositeLoader
{

    constructor(props)
    {
        this.fileHandler = new FileHandler();
        this.compositeElementsFile = props.compositeElementsFile;
        this.mapDataFile = props.mapDataFile;
        this.rootFolder = props.rootFolder;
        this.mapData = sc.get(props, 'mapData', false);
        this.tileMapJSON = sc.get(props, 'tileMapJSON', false);
        this.schemaValidator = new SchemaValidator(MapCompositeDataSchema);
    }

    async execute()
    {
        if(!this.rootFolder){
            Logger.error('Root folder is not defined.');
            return false;
        }
        if(!this.tileMapJSON){
            this.tileMapJSON = this.loadJsonFromFile(this.compositeElementsFile);
            if(!this.tileMapJSON){
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
        this.mapData.tileMapJSON = this.tileMapJSON;
        const generator = new RandomMapGenerator();
        await generator.fromElementsProvider(this.mapData);
        return await generator.generate();
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
        if(!fileName){
            Logger.error('File name is not defined.');
            return false;
        }
        return this.fileHandler.loadJsonFromFile(this.fileHandler.joinPaths(this.rootFolder, fileName));
    }

}

module.exports.LayerElementsCompositeLoader = LayerElementsCompositeLoader;
