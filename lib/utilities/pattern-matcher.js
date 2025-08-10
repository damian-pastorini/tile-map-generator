/**
 *
 * Reldens - Tile Map Generator - PatternMatcher
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PatternMatcher
{

    doesPatternMatch(mapData, mapWidth, elementData, elementWidth, elementHeight, startX, startY)
    {
        for(let y = 0; y < elementHeight; y++){
            for(let x = 0; x < elementWidth; x++){
                let elementIndex = y * elementWidth + x;
                let mapIndex = (startY + y) * mapWidth + (startX + x);
                let elementTile = elementData[elementIndex];
                let mapTile = mapData[mapIndex];
                if(0 === elementTile){
                    continue;
                }
                if(elementTile !== mapTile){
                    return false;
                }
            }
        }
        return true;
    }

    countElementInstancesInMap(map, config, elementType)
    {
        let layerElements = sc.get(config, 'layerElements', {});
        let elementConfig = sc.get(layerElements, elementType, []);
        if(0 === elementConfig.length){
            return 0;
        }
        let elementLayers = elementConfig.filter(layer => 'tilelayer' === layer.type);
        if(0 === elementLayers.length){
            return 0;
        }
        let elementWidth = elementLayers[0].width;
        let elementHeight = elementLayers[0].height;
        let mapLayers = sc.get(map, 'layers', []);
        let mapWidth = sc.get(map, 'width', 0);
        let mapHeight = sc.get(map, 'height', 0);
        Logger.debug('Element layers:', elementLayers.map(l => l.name));
        Logger.debug('Map layer names:', mapLayers.map(l => l.name));
        let count = 0;
        let foundPositions = [];
        for(let y = 0; y <= mapHeight - elementHeight; y++){
            for(let x = 0; x <= mapWidth - elementWidth; x++){
                if(this.positionOverlapsFound(x, y, elementWidth, elementHeight, foundPositions)){
                    continue;
                }
                let allMatch = true;
                let matchedLayers = 0;
                for(let elementLayer of elementLayers){
                    let mapLayer = mapLayers.find(l => l.name === elementLayer.name);
                    if(!mapLayer){
                        allMatch = false;
                        break;
                    }
                    if(!this.doesPatternMatch(
                        mapLayer.data,
                        mapWidth,
                        elementLayer.data,
                        elementWidth,
                        elementHeight,
                        x,
                        y
                    )){
                        allMatch = false;
                        break;
                    }
                    matchedLayers++;
                }
                if(allMatch){
                    Logger.debug('Found element at:', x, y, 'matched layers:', matchedLayers);
                    foundPositions.push({x, y});
                    count++;
                }
            }
        }
        Logger.debug('Total count for', elementType, ':', count);
        return count;
    }

    positionOverlapsFound(x, y, width, height, foundPositions)
    {
        for(let pos of foundPositions){
            if(!(x >= pos.x + width || pos.x >= x + width || y >= pos.y + height || pos.y >= y + height)){
                return true;
            }
        }
        return false;
    }

}

module.exports.PatternMatcher = PatternMatcher;
