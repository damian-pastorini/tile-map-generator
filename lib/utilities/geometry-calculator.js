/**
 *
 * Reldens - Tile Map Generator - GeometryCalculator
 *
 */

const { sc } = require('@reldens/utils');

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

}

module.exports.GeometryCalculator = GeometryCalculator;
