/**
 *
 * Reldens - Tile Map Generator - OptionsValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class OptionsValidator
{
    validate(options)
    {
        if(!sc.get(options, 'tileSize')){
            Logger.error('Missing required option: "tileSize".');
            return false;
        }
        if(!sc.get(options, 'tileSheetPath')){
            Logger.error('Missing required option: "tileSheetPath".');
            return false;
        }
        if(!sc.get(options, 'tileSheetName')){
            Logger.error('Missing required option: "tileSheetName".');
            return false;
        }
        if(!sc.get(options, 'imageHeight')){
            Logger.error('Missing required option: "imageHeight".');
            return false;
        }
        if(!sc.get(options, 'imageWidth')){
            Logger.error('Missing required option: "imageWidth".');
            return false;
        }
        if(!sc.get(options, 'tileCount')){
            Logger.error('Missing required option: "tileCount".');
            return false;
        }
        if(!sc.get(options, 'columns')){
            Logger.error('Missing required option: "columns".');
            return false;
        }
        if(!sc.get(options, 'groundTile')){
            Logger.error('Missing required option: "groundTile".');
            return false;
        }
        if(!sc.get(options, 'layerElements')){
            Logger.error('Missing required option: "layerElements".');
            return false;
        }
        if(!sc.get(options, 'elementsQuantity')){
            Logger.error('Missing required option: "elementsQuantity".');
            return false;
        }
        return true;
    }
}

module.exports.OptionsValidator = OptionsValidator;
