/**
 *
 * Reldens - Tile Map Generator - OptionsValidator
 *
 * Validates the required generation options and the names joined into the generated files paths (map name, map file
 * name and tile sheet name), which must be file names, so the options can not write the map files outside the
 * generated folder.
 *
 */

const { MapNaming } = require('../map/map-naming');
const { Logger, sc } = require('@reldens/utils');

class OptionsValidator
{

    constructor()
    {
        this.lastError = null;
        this.mapNaming = new MapNaming();
        this.fileNameKeys = ['mapName', 'mapFileName', 'tileSheetName'];
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
        for(let fileNameKey of this.fileNameKeys){
            if(sc.hasOwn(options, fileNameKey) && !this.mapNaming.isFileName(options[fileNameKey])){
                this.lastError = 'Invalid option "'+fileNameKey+'", it must be a file name: '+options[fileNameKey];
                Logger.error(this.lastError);
                return false;
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
