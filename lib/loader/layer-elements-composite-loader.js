/**
 *
 * Reldens - Tile Map Generator - LayerElementsCompositeLoader
 *
 */

const { LayerElementsLoader } = require('./layer-elements-loader');
const { MapCompositeDataSchema } = require('../../lib/schemas/map-composite-data-schema');
const { Logger, SchemaValidator, sc } = require('@reldens/utils');

class LayerElementsCompositeLoader extends LayerElementsLoader
{

    constructor(props)
    {
        super(props);
        this.tileMapJSON = sc.get(props, 'tileMapJSON', false);
        this.schemaValidator = new SchemaValidator(MapCompositeDataSchema);
    }

    loadPayload()
    {
        if(!this.tileMapJSON){
            let compositeElementsFile = sc.get(this.mapData, 'compositeElementsFile', false);
            this.tileMapJSON = this.loadJsonFromFile(compositeElementsFile);
            if(!this.tileMapJSON){
                Logger.error('Composite elements file could not be loaded.', compositeElementsFile);
                return false;
            }
        }
        return true;
    }

    assignPayload()
    {
        this.mapData.tileMapJSON = this.tileMapJSON;
    }

}

module.exports.LayerElementsCompositeLoader = LayerElementsCompositeLoader;
