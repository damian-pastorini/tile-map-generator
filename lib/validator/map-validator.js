/**
 *
 * Reldens - Tile Map Generator - MapValidator (Base Class)
 *
 */

const { GeometryCalculator } = require('../map/geometry-calculator');
const { LayerUtility } = require('../map/layer-utility');
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

    runValidationPipeline(steps)
    {
        for(let step of steps){
            let result = step.run();
            this.logValidationResult(step.label, result);
            if(!result.isValid){
                return false;
            }
        }
        return true;
    }

    findLayerByName(map, layerName)
    {
        return LayerUtility.findLayerByName(map, layerName);
    }

    classifyNonZeroTiles(tileData, allowedValues, onViolation)
    {
        let violations = [];
        for(let index = 0; index < tileData.length; index++){
            let tile = tileData[index];
            if(0 === tile){
                continue;
            }
            if(-1 === allowedValues.indexOf(tile)){
                violations.push(onViolation(tile, index));
            }
        }
        return violations;
    }

}

module.exports.MapValidator = MapValidator;
