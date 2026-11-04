/**
 *
 * Reldens - Tile Map Generator - MainPathMirror
 *
 * Resolves the map edge a main path runs along and mirrors a previous map main path onto the opposite edge of the
 * current map, on the current map first walkable row or column, keeping the position along the edge and fitting
 * it inside the current map size.
 *
 */

const { MainPathEdgesConstants } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MainPathMirror
{

    constructor(layerDataFactory)
    {
        this.layerDataFactory = layerDataFactory;
        this.oppositeEdges = {
            [MainPathEdgesConstants.TOP]: MainPathEdgesConstants.BOTTOM,
            [MainPathEdgesConstants.RIGHT]: MainPathEdgesConstants.LEFT,
            [MainPathEdgesConstants.BOTTOM]: MainPathEdgesConstants.TOP,
            [MainPathEdgesConstants.LEFT]: MainPathEdgesConstants.RIGHT
        };
    }

    generateOppositeMainPath(previousMainPath, previousMapSize, mapWidth, mapHeight, isBorderWalkable)
    {
        let previousEdge = this.resolvePathEdge(
            previousMainPath,
            sc.get(previousMapSize, 'mapWidth', mapWidth),
            sc.get(previousMapSize, 'mapHeight', mapHeight)
        );
        let edge = this.oppositeEdges[previousEdge];
        let isHorizontalEdge = MainPathEdgesConstants.TOP === edge || MainPathEdgesConstants.BOTTOM === edge;
        let walkableOffset = isBorderWalkable ? 0 : 1;
        let alongPositions = this.fitAlongPositions(
            previousMainPath.map(point => isHorizontalEdge ? point.x : point.y),
            isHorizontalEdge ? mapWidth : mapHeight,
            walkableOffset
        );
        let generatedMainPathIndexes = this.buildEdgePathIndexes(
            edge,
            walkableOffset,
            alongPositions,
            mapWidth,
            mapHeight
        );
        return {
            generatedMainPathIndexes,
            generatedMainPathIndexesBorder: 0 === walkableOffset
                ? []
                : this.buildEdgePathIndexes(edge, 0, alongPositions, mapWidth, mapHeight),
            hasAssociatedMap: true,
            mainPathStart: this.provideOppositeMainPathStart(generatedMainPathIndexes, mapWidth, mapHeight)
        };
    }

    resolvePathEdge(pathIndexes, mapWidth, mapHeight)
    {
        if(0 === pathIndexes.length){
            return false;
        }
        let firstPoint = [...pathIndexes].shift();
        let lastPoint = [...pathIndexes].pop();
        let middlePoint = pathIndexes[Math.floor(pathIndexes.length / 2)];
        let edgesDistances = {
            [MainPathEdgesConstants.TOP]: middlePoint.y,
            [MainPathEdgesConstants.RIGHT]: mapWidth - 1 - middlePoint.x,
            [MainPathEdgesConstants.BOTTOM]: mapHeight - 1 - middlePoint.y,
            [MainPathEdgesConstants.LEFT]: middlePoint.x
        };
        let candidateEdges = [];
        if(firstPoint.y === lastPoint.y){
            candidateEdges.push(MainPathEdgesConstants.TOP, MainPathEdgesConstants.BOTTOM);
        }
        if(firstPoint.x === lastPoint.x){
            candidateEdges.push(MainPathEdgesConstants.RIGHT, MainPathEdgesConstants.LEFT);
        }
        if(0 === candidateEdges.length){
            Logger.warning('Main path is not a straight line, the closest map edge is used.', pathIndexes);
            candidateEdges = Object.keys(MainPathEdgesConstants).map(edgeKey => MainPathEdgesConstants[edgeKey]);
        }
        return candidateEdges.reduce(
            (closestEdge, edge) => edgesDistances[edge] < edgesDistances[closestEdge] ? edge : closestEdge
        );
    }

    fitAlongPositions(alongPositions, edgeLength, walkableOffset)
    {
        let firstPosition = Math.min(...alongPositions);
        let lastPosition = Math.max(...alongPositions);
        let walkableShift = Math.max(
            Math.min(0, edgeLength - 1 - walkableOffset - lastPosition),
            walkableOffset - firstPosition
        );
        let shift = Math.max(Math.min(walkableShift, edgeLength - 1 - lastPosition), -firstPosition);
        return alongPositions.map(alongPosition => alongPosition + shift);
    }

    buildEdgePathIndexes(edge, edgeOffset, alongPositions, mapWidth, mapHeight)
    {
        return alongPositions.map(alongPosition => {
            let x = alongPosition;
            let y = alongPosition;
            if(MainPathEdgesConstants.TOP === edge){
                y = edgeOffset;
            }
            if(MainPathEdgesConstants.BOTTOM === edge){
                y = mapHeight - 1 - edgeOffset;
            }
            if(MainPathEdgesConstants.LEFT === edge){
                x = edgeOffset;
            }
            if(MainPathEdgesConstants.RIGHT === edge){
                x = mapWidth - 1 - edgeOffset;
            }
            return {index: this.layerDataFactory.tileIndex(y, x, mapWidth), x, y};
        });
    }

    provideOppositeMainPathStart(generatedMainPathIndexes, mapWidth, mapHeight)
    {
        let middlePoint = generatedMainPathIndexes[Math.floor(generatedMainPathIndexes.length / 2)];
        let startX = middlePoint.x;
        let startY = middlePoint.y;
        if(0 === startX){
            startX = 1;
        }
        if(mapWidth - 1 === startX){
            startX = mapWidth - 2;
        }
        if(0 === startY){
            startY = 1;
        }
        if(mapHeight - 1 === startY){
            startY = mapHeight - 2;
        }
        return {x: startX, y: startY};
    }

}

module.exports.MainPathMirror = MainPathMirror;
