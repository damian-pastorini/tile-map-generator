/**
 *
 * Reldens - Tile Map Generator - ElementPositionAnalyzer
 *
 */

const { DistanceCalculator } = require('./distance-calculator');
const { ElementLayerName } = require('./element-layer-name');
const { sc } = require('@reldens/utils');

class ElementPositionAnalyzer
{

    constructor()
    {
        this.distanceCalculator = new DistanceCalculator();
        this.elementLayerName = new ElementLayerName();
    }

    findElementPositionsInMap(map, elementType)
    {
        let positionsByInstance = {};
        let positions = [];
        for(let layer of sc.get(map, 'layers', [])){
            let instanceIndex = this.elementLayerName.instanceIndex(elementType, sc.get(layer, 'name', ''));
            if(null === instanceIndex){
                continue;
            }
            this.addLayerToInstancePosition(positionsByInstance, positions, instanceIndex, elementType, layer, map);
        }
        return positions;
    }

    addLayerToInstancePosition(positionsByInstance, positions, instanceIndex, elementType, layer, map)
    {
        let tilePositions = this.findTilePositions(
            sc.get(layer, 'data', []),
            sc.get(map, 'width', 0),
            sc.get(map, 'height', 0),
            tile => 0 !== tile
        );
        if(0 === tilePositions.length){
            return;
        }
        if(!positionsByInstance[instanceIndex]){
            positionsByInstance[instanceIndex] = {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                layerName: elementType + '-' + instanceIndex,
                tilePositions: []
            };
            positions.push(positionsByInstance[instanceIndex]);
        }
        let position = positionsByInstance[instanceIndex];
        position.tilePositions.push(...tilePositions);
        let boundingBox = this.distanceCalculator.calculateBoundingBox(position.tilePositions);
        position.x = boundingBox.minX;
        position.y = boundingBox.minY;
        position.width = boundingBox.width;
        position.height = boundingBox.height;
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
        for(let row = 0; row < height; row++){
            for(let col = 0; col < width; col++){
                let index = row * width + col;
                let tile = layerData[index];
                let matches = isFunction ? tileValueOrPredicate(tile) : tile === tileValueOrPredicate;
                if(matches){
                    positions.push({x: col, y: row, index});
                }
            }
        }
        return positions;
    }

    forEachElementPair(positions, callback)
    {
        for(let i = 0; i < positions.length; i++){
            this.forEachPairFrom(positions, i, callback);
        }
    }

    forEachPairFrom(positions, i, callback)
    {
        for(let pairIndex = i + 1; pairIndex < positions.length; pairIndex++){
            callback(positions[i], positions[pairIndex], i, pairIndex);
        }
    }

}

module.exports.ElementPositionAnalyzer = ElementPositionAnalyzer;
