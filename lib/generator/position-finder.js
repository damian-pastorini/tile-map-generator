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

    findPosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid)
    {
        if('inOrder' === this.placeElementsOrder){
            return this.findNextAvailablePosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid);
        }
        if('random' === this.placeElementsOrder){
            return this.findRandomPosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid);
        }
        return null;
    }

    findNextAvailablePosition(elementWidth, elementHeight, mapWidth, mapHeight, mapGrid)
    {
        for(let y = 0; y < mapHeight; y++){
            for(let x = 0; x < mapWidth; x++){
                if(this.canPlaceElement(x, y , elementWidth, elementHeight, mapWidth, mapHeight, mapGrid)){
                    return {x, y};
                }
            }
        }
        return null;
    }

    findRandomPosition(width, height, mapWidth, mapHeight, mapGrid)
    {
        if(!this.placeElementsCloserToBorders){
            return this.findRandomPositionOnAnywhere(width, height, mapWidth, mapHeight, mapGrid);
        }
        return this.findRandomPositionCloserToBorders(width, height, mapWidth, mapHeight, mapGrid);
    }

    findRandomPositionOnAnywhere(width, height, mapWidth, mapHeight, mapGrid)
    {
        return this.tryRandomPositions(200, mapWidth - width, mapHeight - height, (x, y) => {
            return this.canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid);
        });
    }

    findRandomPositionCloserToBorders(width, height, mapWidth, mapHeight, mapGrid)
    {
        let maxTries = mapWidth * mapHeight;
        let position = this.tryEdgePositions(width, height, mapWidth, mapHeight, mapGrid);
        if(null !== position){
            return position;
        }
        position = this.tryDistributedBorderPositions(width, height, mapWidth, mapHeight, mapGrid);
        if(null !== position){
            return position;
        }
        return this.tryGridPositions(width, height, maxTries, mapWidth, mapHeight, mapGrid);
    }

    tryEdgePositions(width, height, mapWidth, mapHeight, mapGrid)
    {
        let cornerPositions = [
            {x: 0, y: 0},
            {x: mapWidth - width, y: 0},
            {x: 0, y: mapHeight - height},
            {x: mapWidth - width, y: mapHeight - height}
        ];
        for(let pos of cornerPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height, mapWidth, mapHeight, mapGrid)){
                return pos;
            }
        }
        return null;
    }

    tryDistributedBorderPositions(width, height, mapWidth, mapHeight, mapGrid)
    {
        let topPositions = [];
        let rightPositions = [];
        let bottomPositions = [];
        let leftPositions = [];
        let segmentWidth = Math.floor(mapWidth / 3);
        for(let x = 0; x <= mapWidth - width; x += segmentWidth){
            topPositions.push({x: x, y: 0});
        }
        let segmentHeight = Math.floor(mapHeight / 3);
        for(let y = 0; y <= mapHeight - height; y += segmentHeight){
            rightPositions.push({x: mapWidth - width, y: y});
        }
        for(let x = mapWidth - width; x >= 0; x -= segmentWidth){
            bottomPositions.push({x: x, y: mapHeight - height});
        }
        for(let y = mapHeight - height; y >= 0; y -= segmentHeight){
            leftPositions.push({x: 0, y: y});
        }
        let allPositions = [...topPositions, ...rightPositions, ...bottomPositions, ...leftPositions];
        for(let pos of allPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height, mapWidth, mapHeight, mapGrid)){
                return pos;
            }
        }
        return null;
    }

    tryGridPositions(width, height, maxTries, mapWidth, mapHeight, mapGrid)
    {
        let minDimension = Math.min(mapWidth, mapHeight);
        let maxRings = Math.floor(minDimension / 2);
        for(let ring = 0; ring < maxRings; ring++){
            let minX = ring;
            let minY = ring;
            let maxX = mapWidth - width - ring;
            let maxY = mapHeight - height - ring;
            for(let y = minY; y <= maxY; y++){
                if(this.canPlaceElement(minX, y, width, height, mapWidth, mapHeight, mapGrid)){
                    return {x: minX, y: y};
                }
                if(this.canPlaceElement(maxX, y, width, height, mapWidth, mapHeight, mapGrid)){
                    return {x: maxX, y: y};
                }
            }
            for(let x = minX + 1; x < maxX; x++){
                if(this.canPlaceElement(x, minY, width, height, mapWidth, mapHeight, mapGrid)){
                    return {x: x, y: minY};
                }
                if(this.canPlaceElement(x, maxY, width, height, mapWidth, mapHeight, mapGrid)){
                    return {x: x, y: maxY};
                }
            }
        }
        return this.tryRandomPositions(maxTries, mapWidth - width, mapHeight - height, (x, y) => {
            return this.canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid);
        });
    }

    tryRandomPositions(maxTries, maxX, maxY, predicate)
    {
        for(let tries = 0; tries < maxTries; tries++){
            let x = Math.floor(Math.random() * maxX);
            let y = Math.floor(Math.random() * maxY);
            if(predicate(x, y)){
                return {x, y};
            }
        }
        return null;
    }

    canPlaceElement(x, y, width, height, mapWidth, mapHeight, mapGrid)
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
        return this.generator.geometryCalculator.isFootprintWalkable(mapGrid, x, y, width, height);
    }

}

module.exports.PositionFinder = PositionFinder;
