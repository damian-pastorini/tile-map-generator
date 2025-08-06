/**
 *
 * Reldens - Tile Map Generator - MapValidator (Base Class)
 *
 */

const { Logger, sc } = require('@reldens/utils');

class MapValidator
{

    constructor()
    {
        this.validationResults = [];
        this.validationErrors = [];
        this.validationWarnings = [];
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
        if(!sc.isObject(map)){
            this.logValidationError('Map must be an object');
            return false;
        }
        if('map' !== sc.get(map, 'type')){
            this.logValidationError('Map type must be "map"');
            return false;
        }
        let width = sc.get(map, 'width', 0);
        if(0 >= width){
            this.logValidationError('Map width must be positive: '+width);
            return false;
        }
        let height = sc.get(map, 'height', 0);
        if(0 >= height){
            this.logValidationError('Map height must be positive: '+height);
            return false;
        }
        let layers = sc.get(map, 'layers', []);
        if(!sc.isArray(layers)){
            this.logValidationError('Map layers must be an array');
            return false;
        }
        if(0 === layers.length){
            this.logValidationError('Map must have at least one layer');
            return false;
        }
        for(let i = 0; i < layers.length; i++){
            if(!this.validateLayerStructure(layers[i], width, height, i)){
                return false;
            }
        }
        return true;
    }

    validateLayerStructure(layer, expectedWidth, expectedHeight, layerIndex)
    {
        if(!sc.isObject(layer)){
            this.logValidationError('Layer '+layerIndex+' must be an object');
            return false;
        }
        let layerName = sc.get(layer, 'name', '');
        if('' === layerName){
            this.logValidationError('Layer '+layerIndex+' must have a name');
            return false;
        }
        if('tilelayer' !== sc.get(layer, 'type')){
            this.logValidationError('Layer '+layerName+' must be tilelayer type');
            return false;
        }
        let layerWidth = sc.get(layer, 'width', 0);
        if(layerWidth !== expectedWidth){
            this.logValidationError('Layer '+layerName+' width '+layerWidth+' does not match map width '+expectedWidth);
            return false;
        }
        let layerHeight = sc.get(layer, 'height', 0);
        if(layerHeight !== expectedHeight){
            this.logValidationError(
                'Layer '+layerName+' height '+layerHeight+' does not match map height '+expectedHeight
            );
            return false;
        }
        let layerData = sc.get(layer, 'data', []);
        if(!sc.isArray(layerData)){
            this.logValidationError('Layer '+layerName+' data must be an array');
            return false;
        }
        let expectedDataLength = expectedWidth * expectedHeight;
        if(layerData.length !== expectedDataLength){
            this.logValidationError(
                'Layer '+layerName+' data length '+layerData.length+' does not match expected '+expectedDataLength
            );
            return false;
        }
        for(let i = 0; i < layerData.length; i++){
            let tile = layerData[i];
            if(!sc.isNumber(tile)){
                this.logValidationError('Layer '+layerName+' tile at index '+i+' must be a number');
                return false;
            }
            if(0 > tile){
                this.logValidationError('Layer '+layerName+' tile at index '+i+' must be non-negative: '+tile);
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

    hasValidationErrors()
    {
        return 0 < this.validationErrors.length;
    }

    hasValidationWarnings()
    {
        return 0 < this.validationWarnings.length;
    }

    getValidationSummary()
    {
        return {
            errors: this.validationErrors,
            warnings: this.validationWarnings,
            results: this.validationResults,
            isValid: !this.hasValidationErrors()
        };
    }

    countTilesByValue(layerData, tileValue)
    {
        if(!sc.isArray(layerData)){
            return 0;
        }
        let count = 0;
        for(let tile of layerData){
            if(tile === tileValue){
                count++;
            }
        }
        return count;
    }

    countNonZeroTiles(layerData)
    {
        if(!sc.isArray(layerData)){
            return 0;
        }
        let count = 0;
        for(let tile of layerData){
            if(0 !== tile){
                count++;
            }
        }
        return count;
    }

    findTilePositions(layerData, width, height, tileValueOrPredicate)
    {
        if(!sc.isArray(layerData)){
            return [];
        }
        let positions = [];
        let isFunction = 'function' === typeof tileValueOrPredicate;
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = y * width + x;
                let tile = layerData[index];
                let matches = isFunction ? tileValueOrPredicate(tile) : tile === tileValueOrPredicate;
                if(matches){
                    positions.push({x, y, index});
                }
            }
        }
        return positions;
    }

    calculateDistanceBetweenPositions(pos1, pos2)
    {
        let deltaX = pos1.x - pos2.x;
        let deltaY = pos1.y - pos2.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    getNeighborPositions(x, y, width, height, includeCorners = true)
    {
        let neighbors = [];
        let directions = includeCorners
            ? [
                {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
                {dx: -1, dy: 0},                   {dx: 1, dy: 0},
                {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1}
            ]
            : [
                {dx: 0, dy: -1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: 1}
            ];
        for(let direction of directions){
            let newX = x + direction.dx;
            let newY = y + direction.dy;
            if(0 <= newX && newX < width && 0 <= newY && newY < height){
                neighbors.push({x: newX, y: newY, index: newY * width + newX});
            }
        }
        return neighbors;
    }

    isPositionWithinBounds(x, y, width, height)
    {
        return 0 <= x && x < width && 0 <= y && y < height;
    }

    calculatePercentage(count, total)
    {
        if(0 === total){
            return 0;
        }
        return (count / total) * 100;
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

    getAllLayersByNamePattern(map, namePattern)
    {
        let layers = sc.get(map, 'layers', []);
        let matchedLayers = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 !== layerName.indexOf(namePattern)){
                matchedLayers.push(layer);
            }
        }
        return matchedLayers;
    }

    analyzeLayerStatistics(layerData, layerName)
    {
        if(!sc.isArray(layerData)){
            return null;
        }
        let totalTiles = layerData.length;
        let nonZeroTiles = this.countNonZeroTiles(layerData);
        let zeroTiles = totalTiles - nonZeroTiles;
        let uniqueTileValues = [...new Set(layerData)];
        let tileValueCounts = {};
        for(let tile of layerData){
            let currentCount = sc.get(tileValueCounts, tile, 0);
            tileValueCounts[tile] = currentCount + 1;
        }
        return {
            layerName,
            totalTiles,
            nonZeroTiles,
            zeroTiles,
            uniqueTileValues,
            uniqueTileCount: uniqueTileValues.length,
            tileValueCounts,
            nonZeroPercentage: this.calculatePercentage(nonZeroTiles, totalTiles)
        };
    }

}

module.exports.MapValidator = MapValidator;
