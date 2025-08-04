/**
 *
 * Reldens - Tile Map Generator - OptionsValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class OptionsValidator
{

    constructor()
    {
        this.lastError = null;
    }

    validate(options)
    {
        this.lastError = null;
        if(!sc.get(options, 'tileSize')){
            this.lastError = 'Missing required option: "tileSize".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'tileSheetPath')){
            this.lastError = 'Missing required option: "tileSheetPath".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'tileSheetName')){
            this.lastError = 'Missing required option: "tileSheetName".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'imageHeight')){
            this.lastError = 'Missing required option: "imageHeight".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'imageWidth')){
            this.lastError = 'Missing required option: "imageWidth".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'tileCount')){
            this.lastError = 'Missing required option: "tileCount".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'columns')){
            this.lastError = 'Missing required option: "columns".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'groundTile')){
            this.lastError = 'Missing required option: "groundTile".';
            Logger.error(this.lastError);
            return false;
        }
        if(!sc.get(options, 'layerElements')){
            this.lastError = 'Missing required option: "layerElements".';
            Logger.error(this.lastError);
            return false;
        }
        let elementsQuantity = options.elementsQuantity;
        if(!sc.isObject(elementsQuantity) || 0 === Object.keys(elementsQuantity).length){
            this.lastError = 'Missing required option: "elementsQuantity".';
            Logger.error(this.lastError);
            return false;
        }
        let mainPathSize = options.mainPathSize;
        if(sc.hasOwn(options, 'mainPathSize') && 0 > mainPathSize){
            this.lastError = 'Invalid negative mainPathSize: '+mainPathSize;
            Logger.error(this.lastError);
            return false;
        }
        return true;
    }

}

module.exports.OptionsValidator = OptionsValidator;
