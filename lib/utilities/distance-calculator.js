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

    calculateManhattanDistance(pos1, pos2)
    {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    calculateChebyshevDistance(pos1, pos2)
    {
        return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
    }

    findNearestPosition(targetPos, positionsList)
    {
        if(!sc.isArray(positionsList)){
            return null;
        }
        if(0 === positionsList.length){
            return null;
        }
        let nearestPos = positionsList[0];
        let minDistance = this.calculateEuclideanDistance(targetPos, nearestPos);
        for(let i = 1; i < positionsList.length; i++){
            let currentDistance = this.calculateEuclideanDistance(targetPos, positionsList[i]);
            if(currentDistance < minDistance){
                minDistance = currentDistance;
                nearestPos = positionsList[i];
            }
        }
        return {position: nearestPos, distance: minDistance};
    }

    findPositionsWithinDistance(centerPos, positionsList, maxDistance, distanceType = 'euclidean')
    {
        if(!sc.isArray(positionsList)){
            return [];
        }
        let positionsWithinDistance = [];
        for(let pos of positionsList){
            let distance = this.calculateDistanceByType(centerPos, pos, distanceType);
            if(distance <= maxDistance){
                positionsWithinDistance.push({position: pos, distance});
            }
        }
        return positionsWithinDistance;
    }

    calculateDistanceByType(pos1, pos2, distanceType)
    {
        if('manhattan' === distanceType){
            return this.calculateManhattanDistance(pos1, pos2);
        }
        if('chebyshev' === distanceType){
            return this.calculateChebyshevDistance(pos1, pos2);
        }
        return this.calculateEuclideanDistance(pos1, pos2);
    }

    validateMinimumDistances(positions, minimumDistance, distanceType = 'euclidean')
    {
        if(!sc.isArray(positions) || 2 > positions.length){
            return {isValid: true, violations: []};
        }
        let violations = [];
        for(let i = 0; i < positions.length; i++){
            for(let j = i + 1; j < positions.length; j++){
                let distance = this.calculateDistanceByType(positions[i], positions[j], distanceType);
                if(distance < minimumDistance){
                    violations.push({
                        position1: positions[i],
                        position2: positions[j],
                        actualDistance: distance,
                        minimumRequired: minimumDistance,
                        violation: minimumDistance - distance
                    });
                }
            }
        }
        return {
            isValid: 0 === violations.length,
            violations,
            violationCount: violations.length
        };
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

    calculateDistanceMatrix(positions, distanceType = 'euclidean')
    {
        if(!sc.isArray(positions)){
            return [];
        }
        let matrix = [];
        for(let i = 0; i < positions.length; i++){
            matrix[i] = [];
            for(let j = 0; j < positions.length; j++){
                if(i === j){
                    matrix[i][j] = 0;
                    continue;
                }
                matrix[i][j] = this.calculateDistanceByType(positions[i], positions[j], distanceType);
            }
        }
        return matrix;
    }

    findClosestPair(positions, distanceType = 'euclidean')
    {
        if(!sc.isArray(positions) || positions.length < 2){
            return null;
        }
        let closestPair = {
            position1: positions[0],
            position2: positions[1],
            distance: this.calculateDistanceByType(positions[0], positions[1], distanceType)
        };
        for(let i = 0; i < positions.length; i++){
            for(let j = i + 1; j < positions.length; j++){
                let distance = this.calculateDistanceByType(positions[i], positions[j], distanceType);
                if(distance < closestPair.distance){
                    closestPair.position1 = positions[i];
                    closestPair.position2 = positions[j];
                    closestPair.distance = distance;
                }
            }
        }
        return closestPair;
    }

    findFarthestPair(positions, distanceType = 'euclidean')
    {
        if(!sc.isArray(positions) || positions.length < 2){
            return null;
        }
        let farthestPair = {
            position1: positions[0],
            position2: positions[1],
            distance: this.calculateDistanceByType(positions[0], positions[1], distanceType)
        };
        for(let i = 0; i < positions.length; i++){
            for(let j = i + 1; j < positions.length; j++){
                let distance = this.calculateDistanceByType(positions[i], positions[j], distanceType);
                if(distance > farthestPair.distance){
                    farthestPair.position1 = positions[i];
                    farthestPair.position2 = positions[j];
                    farthestPair.distance = distance;
                }
            }
        }
        return farthestPair;
    }

    analyzeSpatialDistribution(positions, distanceType = 'euclidean')
    {
        if(!sc.isArray(positions) || positions.length < 2){
            return null;
        }
        let distances = [];
        for(let i = 0; i < positions.length; i++){
            for(let j = i + 1; j < positions.length; j++){
                distances.push(this.calculateDistanceByType(positions[i], positions[j], distanceType));
            }
        }
        distances.sort((a, b) => a - b);
        let sum = distances.reduce((acc, dist) => acc + dist, 0);
        let mean = sum / distances.length;
        let median = 0 === distances.length % 2
            ? (distances[distances.length / 2 - 1] + distances[distances.length / 2]) / 2
            : distances[Math.floor(distances.length / 2)];
        let variance = distances.reduce((acc, dist) => acc + Math.pow(dist - mean, 2), 0) / distances.length;
        let standardDeviation = Math.sqrt(variance);
        return {
            totalDistances: distances.length,
            minimumDistance: distances[0],
            maximumDistance: distances[distances.length - 1],
            meanDistance: mean,
            medianDistance: median,
            standardDeviation,
            variance,
            boundingBox: this.calculateBoundingBox(positions)
        };
    }

    isPositionWithinBoundary(position, boundary)
    {
        return position.x >= boundary.minX
            && position.x <= boundary.maxX
            && position.y >= boundary.minY
            && position.y <= boundary.maxY;
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
