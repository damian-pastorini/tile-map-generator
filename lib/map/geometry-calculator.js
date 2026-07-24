/**
 *
 * Reldens - Tile Map Generator - GeometryCalculator
 *
 */

class GeometryCalculator
{

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

    connectedTiles(tileIndex, bordersLayer, layerWidth)
    {
        return {
            top: bordersLayer[tileIndex - layerWidth],
            down: bordersLayer[tileIndex + layerWidth],
            left: bordersLayer[tileIndex - 1],
            right: bordersLayer[tileIndex + 1]
        };
    }

    countConnected(tileConnections)
    {
        let top = 0 === tileConnections.top ? 0 : 1;
        let down = 0 === tileConnections.down ? 0 : 1;
        let left = 0 === tileConnections.left ? 0 : 1;
        let right = 0 === tileConnections.right ? 0 : 1;
        return {
            connections: [top, down, left, right],
            total: top + down + left + right
        };
    }

    randomCentralIndex(width, height, applyBorders)
    {
        let startX = applyBorders ? 1 : 0;
        let endX = applyBorders ? width - 2 : width - 1;
        let startY = applyBorders ? 1 : 0;
        let endY = applyBorders ? height - 2 : height - 1;
        let midX = Math.floor((endX - startX) / 2);
        let midY = Math.floor((endY - startY) / 2);
        let x = startX + midX;
        let y = startY + midY;
        return y * width + x;
    }

    get4Neighbors(index, width, height, applyBorders)
    {
        let neighbors = [];
        let x = index % width;
        let y = Math.floor(index / width);
        let isUp = applyBorders ? y > 1 : y > 0;
        let isDown = applyBorders ? y < height - 2 : y < height - 1;
        let isLeft = applyBorders ? x > 1 : x > 0;
        let isRight = applyBorders ? x < width - 2 : x < width - 1;
        if(isUp){
            neighbors.push(index - width);
        }
        if(isDown){
            neighbors.push(index + width);
        }
        if(isLeft){
            neighbors.push(index - 1);
        }
        if(isRight){
            neighbors.push(index + 1);
        }
        return neighbors;
    }

    rectsOverlap(rectA, rectB, padding = 0)
    {
        return rectA.x < rectB.x + rectB.width + padding
            && rectA.x + rectA.width > rectB.x - padding
            && rectA.y < rectB.y + rectB.height + padding
            && rectA.y + rectA.height > rectB.y - padding;
    }

    placementOffsets()
    {
        return [
            {x: 1, y: 0},
            {x: 1, y: 1},
            {x: 0, y: 1},
            {x: -1, y: 1},
            {x: -1, y: 0},
            {x: -1, y: -1},
            {x: 0, y: -1},
            {x: 1, y: -1}
        ];
    }

    isFootprintWalkable(mapGrid, x, y, width, height)
    {
        for(let i = y; i < y + height; i++){
            for(let j = x; j < x + width; j++){
                if(!mapGrid[i][j]){
                    return false;
                }
            }
        }
        return true;
    }

    buildBlockedIntegral(mapGrid, width, height)
    {
        let stride = width + 1;
        let integral = new Array((width + 1) * (height + 1)).fill(0);
        for(let rowIndex = 0; rowIndex < height; rowIndex++){
            this.accumulateBlockedIntegralRow(mapGrid, integral, stride, width, rowIndex);
        }
        return integral;
    }

    accumulateBlockedIntegralRow(mapGrid, integral, stride, width, rowIndex)
    {
        let rowSum = 0;
        for(let columnIndex = 0; columnIndex < width; columnIndex++){
            rowSum += mapGrid[rowIndex][columnIndex] ? 0 : 1;
            let baseIndex = rowIndex * stride + columnIndex + 1;
            integral[baseIndex + stride] = integral[baseIndex] + rowSum;
        }
    }

    hasFreeWindow(integral, mapWidth, mapHeight, windowWidth, windowHeight, excludeRect)
    {
        if(mapWidth < windowWidth){
            return false;
        }
        if(mapHeight < windowHeight){
            return false;
        }
        for(let rowIndex = 0; rowIndex + windowHeight <= mapHeight; rowIndex++){
            if(this.rowHasFreeWindow(integral, mapWidth, windowWidth, windowHeight, rowIndex, excludeRect)){
                return true;
            }
        }
        return false;
    }

    rowHasFreeWindow(integral, mapWidth, windowWidth, windowHeight, rowIndex, excludeRect)
    {
        let stride = mapWidth + 1;
        let topRow = rowIndex * stride;
        let bottomRow = (rowIndex + windowHeight) * stride;
        for(let columnIndex = 0; columnIndex + windowWidth <= mapWidth; columnIndex++){
            let blockedSum = integral[bottomRow + columnIndex + windowWidth]
                - integral[topRow + columnIndex + windowWidth]
                - integral[bottomRow + columnIndex]
                + integral[topRow + columnIndex];
            if(0 < blockedSum){
                continue;
            }
            if(
                excludeRect
                && this.rectsOverlap({x: columnIndex, y: rowIndex, width: windowWidth, height: windowHeight}, excludeRect)
            ){
                continue;
            }
            return true;
        }
        return false;
    }

    canFitAllFootprints(integral, mapWidth, mapHeight, candidateRect, footprints)
    {
        for(let footprint of footprints){
            if(!this.hasFreeWindow(integral, mapWidth, mapHeight, footprint.width, footprint.height, candidateRect)){
                return false;
            }
        }
        return true;
    }

    distinctFootprintsByAreaDesc(footprints)
    {
        let distinct = [];
        let seenKeys = [];
        for(let entry of footprints){
            let sizeKey = entry.width+'x'+entry.height;
            if(-1 !== seenKeys.indexOf(sizeKey)){
                continue;
            }
            seenKeys.push(sizeKey);
            distinct.push({width: entry.width, height: entry.height, area: entry.width * entry.height});
        }
        for(let index = 0; index < distinct.length; index++){
            this.swapLargestAreaFirst(distinct, index);
        }
        return distinct;
    }

    swapLargestAreaFirst(distinct, startIndex)
    {
        let maxIndex = startIndex;
        for(let index = startIndex + 1; index < distinct.length; index++){
            if(distinct[index].area > distinct[maxIndex].area){
                maxIndex = index;
            }
        }
        if(startIndex === maxIndex){
            return;
        }
        let temporalEntry = distinct[startIndex];
        distinct[startIndex] = distinct[maxIndex];
        distinct[maxIndex] = temporalEntry;
    }

    findNearestPosition(origin, positions)
    {
        if(0 === positions.length){
            return null;
        }
        let nearest = positions[0];
        let minDistance = this.calculateDistanceBetweenPositions(origin, nearest);
        for(let i = 1; i < positions.length; i++){
            let candidate = positions[i];
            let distance = this.calculateDistanceBetweenPositions(origin, candidate);
            if(distance < minDistance){
                minDistance = distance;
                nearest = candidate;
            }
        }
        return nearest;
    }

}

module.exports.GeometryCalculator = GeometryCalculator;
