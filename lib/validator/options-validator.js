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
        this.requiredKeys = [
            'tileSize',
            'tileSheetPath',
            'tileSheetName',
            'imageHeight',
            'imageWidth',
            'tileCount',
            'columns',
            'groundTile',
            'layerElements'
        ];
    }

    failMissing(key)
    {
        this.lastError = 'Missing required option: "'+key+'".';
        Logger.error(this.lastError);
        return false;
    }

    validate(options)
    {
        this.lastError = null;
        for(let requiredKey of this.requiredKeys){
            if(!sc.get(options, requiredKey)){
                return this.failMissing(requiredKey);
            }
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
