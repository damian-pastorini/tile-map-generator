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

}

module.exports.GeometryCalculator = GeometryCalculator;
