/**
 *
 * Reldens - Tile Map Generator - LayerElementsCompositeLoader
 *
 */

const { LayerElementsLoader } = require('./layer-elements-loader');
const { MapCompositeDataSchema } = require('../../lib/schemas/map-composite-data-schema');
const { SchemaValidator, sc } = require('@reldens/utils');

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
            this.tileMapJSON = this.loadJsonFromFile(sc.get(this.mapData, 'compositeElementsFile', false));
            if(!this.tileMapJSON){
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
