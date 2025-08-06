/**
 *
 * Reldens - Tile Map Generator - DistanceCalculator
 *
 */

const { sc } = require('@reldens/utils');

class DistanceCalculator
{

    calculateEuclideanDistance(pos1, pos2)
    {
        let deltaX = pos1.x - pos2.x;
        let deltaY = pos1.y - pos2.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    calculateBoundingBox(positions)
    {
        if(!sc.isArray(positions) || 0 === positions.length){
            return null;
        }
        let minX = positions[0].x;
        let maxX = positions[0].x;
        let minY = positions[0].y;
        let maxY = positions[0].y;
        for(let pos of positions){
            if(pos.x < minX){
                minX = pos.x;
            }
            if(pos.x > maxX){
                maxX = pos.x;
            }
            if(pos.y < minY){
                minY = pos.y;
            }
            if(pos.y > maxY){
                maxY = pos.y;
            }
        }
        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            center: {
                x: Math.floor((minX + maxX) / 2),
                y: Math.floor((minY + maxY) / 2)
            }
        };
    }

    calculateFreeSpaceBoundary(centerPos, freeSpaceRadius)
    {
        return {
            minX: centerPos.x - freeSpaceRadius,
            maxX: centerPos.x + freeSpaceRadius,
            minY: centerPos.y - freeSpaceRadius,
            maxY: centerPos.y + freeSpaceRadius,
            center: centerPos,
            radius: freeSpaceRadius
        };
    }

}

module.exports.DistanceCalculator = DistanceCalculator;
