/**
 *
 * Reldens - Tile Map Generator - BoundaryValidator
 *
 */

const { sc } = require('@reldens/utils');

class BoundaryValidator
{

    checkElementWithinBoundaries(position, mapWidth, mapHeight)
    {
        let violations = [];
        if(0 > position.x){
            violations.push('Left boundary violation: x='+position.x);
        }
        if(0 > position.y){
            violations.push('Top boundary violation: y='+position.y);
        }
        let rightBound = position.x + position.width - 1;
        if(rightBound >= mapWidth){
            violations.push('Right boundary violation: right='+rightBound+', mapWidth='+mapWidth);
        }
        let bottomBound = position.y + position.height - 1;
        if(bottomBound >= mapHeight){
            violations.push('Bottom boundary violation: bottom='+bottomBound+', mapHeight='+mapHeight);
        }
        return {
            isValid: 0 === violations.length,
            violations
        };
    }

    validateMapStructure(map)
    {
        if(!sc.isObject(map)){
            return {isValid: false, error: 'Map must be an object'};
        }
        if('map' !== sc.get(map, 'type')){
            return {isValid: false, error: 'Map type must be "map"'};
        }
        let width = sc.get(map, 'width', 0);
        if(0 >= width){
            return {isValid: false, error: 'Map width must be positive: '+width};
        }
        let height = sc.get(map, 'height', 0);
        if(0 >= height){
            return {isValid: false, error: 'Map height must be positive: '+height};
        }
        let layers = sc.get(map, 'layers', []);
        if(!sc.isArray(layers)){
            return {isValid: false, error: 'Map layers must be an array'};
        }
        if(0 === layers.length){
            return {isValid: false, error: 'Map must have at least one layer'};
        }
        return {isValid: true};
    }

    validateLayerStructure(layer, expectedWidth, expectedHeight, layerIndex)
    {
        if(!sc.isObject(layer)){
            return {isValid: false, error: 'Layer '+layerIndex+' must be an object'};
        }
        let layerName = sc.get(layer, 'name', '');
        if('' === layerName){
            return {isValid: false, error: 'Layer '+layerIndex+' must have a name'};
        }
        if('tilelayer' !== sc.get(layer, 'type')){
            return {isValid: false, error: 'Layer '+layerName+' must be tilelayer type'};
        }
        let layerWidth = sc.get(layer, 'width', 0);
        if(layerWidth !== expectedWidth){
            return {
                isValid: false,
                error: 'Layer '+layerName+' width '+layerWidth+' does not match map width '+expectedWidth
            };
        }
        let layerHeight = sc.get(layer, 'height', 0);
        if(layerHeight !== expectedHeight){
            return {
                isValid: false,
                error: 'Layer '+layerName+' height '+layerHeight+' does not match map height '+expectedHeight
            };
        }
        let layerData = sc.get(layer, 'data', []);
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer '+layerName+' data must be an array'};
        }
        let expectedDataLength = expectedWidth * expectedHeight;
        if(layerData.length !== expectedDataLength){
            return {
                isValid: false,
                error: 'Layer '+layerName
                    +' data length '+layerData.length
                    +' does not match expected '+expectedDataLength
            };
        }
        for(let i = 0; i < layerData.length; i++){
            let tile = layerData[i];
            if(!sc.isNumber(tile)){
                return {isValid: false, error: 'Layer '+layerName+' tile at index '+i+' must be a number'};
            }
            if(0 > tile){
                return {isValid: false, error: 'Layer '+layerName+' tile at index '+i+' must be non-negative: '+tile};
            }
        }
        return {isValid: true};
    }

}

module.exports.BoundaryValidator = BoundaryValidator;
