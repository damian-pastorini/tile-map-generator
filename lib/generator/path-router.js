/**
 *
 * Reldens - Tile Map Generator - PathRouter
 *
 */

const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { Logger, sc } = require('@reldens/utils');

class PathRouter
{

    constructor(pathFinder, geometryCalculator)
    {
        this.pathFinder = pathFinder;
        this.geometryCalculator = geometryCalculator;
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
    }

    findPathToPoints(pathTilePosition, endPathTilePosition, pathTilePositions, grid)
    {
        let path = this.pathFinder.findPath(pathTilePosition, endPathTilePosition, grid);
        if(0 < path.length){
            Logger.debug('Path found for "endPathTilePosition".', {
                pathTilePosition: pathTilePosition ? grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y) : false,
                walkableEndPathTilePosition: endPathTilePosition
                    ? grid.isWalkableAt(endPathTilePosition.x, endPathTilePosition.y)
                    : false
            });
            return path;
        }
        if(0 === path.length){
            Logger.debug('Path not found, retrying over "pathTilePositions".');
            let filteredPositions = pathTilePositions.filter(position => position !== pathTilePosition);
            for(let differentPathTilePosition of filteredPositions){
                path = this.pathFinder.findPath(pathTilePosition, differentPathTilePosition, grid);
                Logger.debug('Retrying position.', {
                    pathTilePosition,
                    walkablePathTilePosition: grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y),
                    differentPathTilePosition,
                    walkablePoint: grid.isWalkableAt(differentPathTilePosition.x, differentPathTilePosition.y),
                    path
                });
                if(0 < path.length){
                    Logger.debug('Path found after retry on position.', differentPathTilePosition);
                    return path;
                }
            }
        }
        Logger.warning('Path not found, check walkable points.');
        return path;
    }

    fetchEndPathTilePosition(pathTilePositions, pathTilePosition, mainPathStart)
    {
        if(mainPathStart){
            return mainPathStart
        }
        if(sc.isArray(pathTilePositions)){
            return pathTilePositions[0];
        }
        return pathTilePosition;
    }

    sortPositionsByDistanceFromCenter(positions, mapWidth, mapHeight, sortPositionsRelativeToTheMapCenter)
    {
        if(!sortPositionsRelativeToTheMapCenter){
            return positions;
        }
        let center = {x: Math.floor(mapWidth / 2), y: Math.floor(mapHeight / 2)};
        let positionsWithDistance = [];
        for(let i = 0; i < positions.length; i++){
            let position = positions[i];
            let distance = this.geometryCalculator.calculateDistanceBetweenPositions(position, center);
            positionsWithDistance.push({
                position: position,
                distance: distance
            });
        }
        positionsWithDistance.sort(function(a, b){
            return a.distance - b.distance;
        });
        let sortedPositions = [];
        for(let i = 0; i < positionsWithDistance.length; i++){
            sortedPositions.push(positionsWithDistance[i].position);
        }
        return sortedPositions;
    }

    findPathTilePositions(layerData, width, height, pathTile)
    {
        return this.elementPositionAnalyzer.findTilePositions(layerData, width, height, pathTile);
    }

}

module.exports.PathRouter = PathRouter;
