/**
 *
 * Reldens - Tile Map Generator - MapValidator (Base Class)
 *
 */

const { GeometryCalculator } = require('../utilities/geometry-calculator');
const { BoundaryValidator } = require('./boundary-validator');
const { Logger, sc } = require('@reldens/utils');

class MapValidator
{

    constructor()
    {
        this.validationResults = [];
        this.validationErrors = [];
        this.validationWarnings = [];
        this.geometryCalculator = new GeometryCalculator();
        this.boundaryValidator = new BoundaryValidator();
    }

    validateMap(map, config, options = {})
    {
        this.clearValidationState();
        if(!this.validateMapStructure(map)){
            return false;
        }
        if(!this.validateMapConfiguration(config)){
            return false;
        }
        return this.performValidation(map, config, options);
    }

    clearValidationState()
    {
        this.validationResults = [];
        this.validationErrors = [];
        this.validationWarnings = [];
    }

    validateMapStructure(map)
    {
        let structureValidation = this.boundaryValidator.validateMapStructure(map);
        if(!structureValidation.isValid){
            this.logValidationError(structureValidation.error);
            return false;
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let layers = sc.get(map, 'layers', []);
        for(let i = 0; i < layers.length; i++){
            let layerValidation = this.boundaryValidator.validateLayerStructure(layers[i], width, height, i);
            if(!layerValidation.isValid){
                this.logValidationError(layerValidation.error);
                return false;
            }
        }
        return true;
    }

    validateMapConfiguration(config)
    {
        if(!sc.isObject(config)){
            this.logValidationError('Configuration must be an object');
            return false;
        }
        return true;
    }

    performValidation(map, config, options)
    {
        return true;
    }

    logValidationError(message)
    {
        this.validationErrors.push(message);
        Logger.critical('MapValidator Error: '+message);
    }

    logValidationWarning(message)
    {
        this.validationWarnings.push(message);
        Logger.warning('MapValidator Warning: '+message);
    }

    logValidationResult(message, data = {})
    {
        let result = {message, data};
        this.validationResults.push(result);
        Logger.info('MapValidator Result: '+message);
    }

    findLayerByName(map, layerName)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            if(sc.get(layer, 'name') === layerName){
                return layer;
            }
        }
        return null;
    }

}

module.exports.MapValidator = MapValidator;
