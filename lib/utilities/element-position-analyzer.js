/**
 *
 * Reldens - Tile Map Generator - ElementPositionAnalyzer
 *
 */

const { DistanceCalculator } = require('./distance-calculator');
const { sc } = require('@reldens/utils');

class ElementPositionAnalyzer
{

    constructor()
    {
        this.distanceCalculator = new DistanceCalculator();
    }

    findElementPositionsInMap(map, elementType)
    {
        let layers = sc.get(map, 'layers', []);
        let positions = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 === layerName.indexOf(elementType)){
                continue;
            }
            let elementPosition = this.detectElementPositionInLayer(layer, map);
            if(elementPosition){
                positions.push({
                    x: elementPosition.x,
                    y: elementPosition.y,
                    width: elementPosition.width,
                    height: elementPosition.height,
                    layerName,
                    tilePositions: elementPosition.tilePositions
                });
            }
        }
        return positions;
    }

    detectElementPositionInLayer(layer, map)
    {
        let layerData = sc.get(layer, 'data', []);
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let nonZeroPositions = this.findTilePositions(layerData, width, height, tile => 0 !== tile);
        if(0 === nonZeroPositions.length){
            return null;
        }
        let boundingBox = this.distanceCalculator.calculateBoundingBox(nonZeroPositions);
        return {
            x: boundingBox.minX,
            y: boundingBox.minY,
            width: boundingBox.width,
            height: boundingBox.height,
            tilePositions: nonZeroPositions
        };
    }

    gatherElementPositions(map, config)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let elementPositions = [];
        for(let elementType of Object.keys(elementsQuantity)){
            let positions = this.findElementPositionsInMap(map, elementType);
            for(let pos of positions){
                elementPositions.push({...pos, elementType});
            }
        }
        return elementPositions;
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

}

module.exports.ElementPositionAnalyzer = ElementPositionAnalyzer;
