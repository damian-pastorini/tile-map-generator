/**
 *
 * Reldens - PositionFinder
 *
 */

class PositionFinder
{

    constructor(generator)
    {
        this.generator = generator;
        this.placeElementsOrder = generator.placeElementsOrder;
        this.placeElementsCloserToBorders = generator.placeElementsCloserToBorders;
        this.minimumDistanceFromBorders = generator.minimumDistanceFromBorders;
    }

    findPosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid, validator = null)
    {
        if('inOrder' === this.placeElementsOrder){
            return this.findNextAvailablePosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid, validator);
        }
        if('random' === this.placeElementsOrder){
            return this.findRandomPosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid, validator);
        }
        return null;
    }

    findNextAvailablePosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid, validator = null)
    {
        for(let posY = 0; posY < mapHeight; posY++){
            for(let posX = 0; posX < mapWidth; posX++){
                if(
                    this.canPlaceElement(posX, posY, elementWidth, elementHeight, mapWidth, mapHeight, mapGrid, validator)
                ){
                    return {x: posX, y: posY};
                }
            }
        }
        return null;
    }

    findRandomPosition(width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        if(!this.placeElementsCloserToBorders){
            return this.findRandomPositionOnAnywhere(width, height, mapWidth, mapHeight, mapGrid, validator);
        }
        return this.findRandomPositionCloserToBorders(width, height, mapWidth, mapHeight, mapGrid, validator);
    }

    findRandomPositionOnAnywhere(width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        return this.tryRandomPositions(200, mapWidth - width, mapHeight - height, (x, y) => {
            return this.canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid, validator);
        });
    }

    findRandomPositionCloserToBorders(width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        let maxTries = mapWidth * mapHeight;
        let position = this.tryEdgePositions(width, height, mapWidth, mapHeight, mapGrid, validator);
        if(null !== position){
            return position;
        }
        position = this.tryDistributedBorderPositions(width, height, mapWidth, mapHeight, mapGrid, validator);
        if(null !== position){
            return position;
        }
        return this.tryGridPositions(width, height, maxTries, mapWidth, mapHeight, mapGrid, validator);
    }

    tryEdgePositions(width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        let cornerPositions = [
            {x: 0, y: 0},
            {x: mapWidth - width, y: 0},
            {x: 0, y: mapHeight - height},
            {x: mapWidth - width, y: mapHeight - height}
        ];
        for(let pos of cornerPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height, mapWidth, mapHeight, mapGrid, validator)){
                return pos;
            }
        }
        return null;
    }

    tryDistributedBorderPositions(width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        let topPositions = [];
        let rightPositions = [];
        let bottomPositions = [];
        let leftPositions = [];
        let segmentWidth = Math.floor(mapWidth / 3);
        for(let posX = 0; posX <= mapWidth - width; posX += segmentWidth){
            topPositions.push({x: posX, y: 0});
        }
        let segmentHeight = Math.floor(mapHeight / 3);
        for(let posY = 0; posY <= mapHeight - height; posY += segmentHeight){
            rightPositions.push({x: mapWidth - width, y: posY});
        }
        for(let posX = mapWidth - width; posX >= 0; posX -= segmentWidth){
            bottomPositions.push({x: posX, y: mapHeight - height});
        }
        for(let posY = mapHeight - height; posY >= 0; posY -= segmentHeight){
            leftPositions.push({x: 0, y: posY});
        }
        let allPositions = [...topPositions, ...rightPositions, ...bottomPositions, ...leftPositions];
        for(let pos of allPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height, mapWidth, mapHeight, mapGrid, validator)){
                return pos;
            }
        }
        return null;
    }

    tryGridPositions(width, height, maxTries, mapWidth, mapHeight, mapGrid, validator = null)
    {
        let minDimension = Math.min(mapWidth, mapHeight);
        let maxRings = Math.floor(minDimension / 2);
        for(let ring = 0; ring < maxRings; ring++){
            let minX = ring;
            let minY = ring;
            let maxX = mapWidth - width - ring;
            let maxY = mapHeight - height - ring;
            for(let posY = minY; posY <= maxY; posY++){
                if(this.canPlaceElement(minX, posY, width, height, mapWidth, mapHeight, mapGrid, validator)){
                    return {x: minX, y: posY};
                }
                if(this.canPlaceElement(maxX, posY, width, height, mapWidth, mapHeight, mapGrid, validator)){
                    return {x: maxX, y: posY};
                }
            }
            for(let posX = minX + 1; posX < maxX; posX++){
                if(this.canPlaceElement(posX, minY, width, height, mapWidth, mapHeight, mapGrid, validator)){
                    return {x: posX, y: minY};
                }
                if(this.canPlaceElement(posX, maxY, width, height, mapWidth, mapHeight, mapGrid, validator)){
                    return {x: posX, y: maxY};
                }
            }
        }
        return this.tryRandomPositions(maxTries, mapWidth - width, mapHeight - height, (x, y) => {
            return this.canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid, validator);
        });
    }

    tryRandomPositions(maxTries, maxX, maxY, predicate, validator = null)
    {
        for(let tries = 0; tries < maxTries; tries++){
            let x = Math.floor(Math.random() * maxX);
            let y = Math.floor(Math.random() * maxY);
            if(!predicate(x, y)){
                continue;
            }
            if(validator && !validator(x, y)){
                continue;
            }
            return {x, y};
        }
        return null;
    }

    canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid, validator = null)
    {
        if(0 < this.minimumDistanceFromBorders){
            if(x < this.minimumDistanceFromBorders){
                return false;
            }
            if(y < this.minimumDistanceFromBorders){
                return false;
            }
            if(x + width > mapWidth - this.minimumDistanceFromBorders){
                return false;
            }
            if(y + height > mapHeight - this.minimumDistanceFromBorders){
                return false;
            }
        }
        if(!this.generator.geometryCalculator.isFootprintWalkable(mapGrid, x, y, width, height)){
            return false;
        }
        if(validator && !validator(x, y)){
            return false;
        }
        return true;
    }

}

module.exports.PositionFinder = PositionFinder;
