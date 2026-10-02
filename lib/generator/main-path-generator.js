/**
 *
 * Reldens - Tile Map Generator - MainPathGenerator
 *
 */

const { MainPathEdgesConstants } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MainPathGenerator
{

    constructor(tilePositionCalculator, returnPointWriter, layerDataFactory, mapGridBuilder, mainPathMirror)
    {
        this.tilePositionCalculator = tilePositionCalculator;
        this.returnPointWriter = returnPointWriter;
        this.layerDataFactory = layerDataFactory;
        this.mapGridBuilder = mapGridBuilder;
        this.mainPathMirror = mainPathMirror;
    }

    placeMainPath(
        pathLayerData,
        mapGrid,
        mapWidth,
        mapHeight,
        generatedMainPathIndexes,
        generatedMainPathIndexesBorder,
        generatedReturnPoints,
        pathLayerProperties,
        hasAssociatedMap,
        mainPathStart,
        previousMainPath,
        previousMapSize,
        mainPathSize,
        isBorderWalkable,
        blockMapBorder,
        mapName,
        pathTile,
        recordDefaultReturnPoint
    ){
        if(0 < previousMainPath.length){
            let oppositeResult = this.mainPathMirror.generateOppositeMainPath(
                previousMainPath,
                previousMapSize,
                mapWidth,
                mapHeight,
                isBorderWalkable
            );
            generatedMainPathIndexes = oppositeResult.generatedMainPathIndexes;
            generatedMainPathIndexesBorder = oppositeResult.generatedMainPathIndexesBorder;
            hasAssociatedMap = oppositeResult.hasAssociatedMap;
            mainPathStart = oppositeResult.mainPathStart;
        }
        if(0 === generatedMainPathIndexes.length){
            let randomResult = this.generateRandomMainPath(mapWidth, mapHeight, mainPathSize, isBorderWalkable);
            mainPathStart = randomResult.mainPathStart;
            generatedMainPathIndexes = randomResult.generatedMainPathIndexes;
            if(randomResult.mainPathStartBorder){
                generatedMainPathIndexesBorder = randomResult.generatedMainPathIndexesBorder;
            }
        }
        let placementFailed = false;
        if(0 < generatedMainPathIndexes.length){
            placementFailed = this.placeAllMainPathIndexes(generatedMainPathIndexes, pathLayerData, mapGrid, pathTile);
            if(!placementFailed && recordDefaultReturnPoint && !generatedReturnPoints['default-main-path']){
                let {returnPointX, returnPointY, position} = this.determineReturnPointFromMainPath(
                    generatedMainPathIndexes,
                    mapWidth,
                    mapHeight,
                    blockMapBorder
                );
                let returnPointIndex = this.tilePositionCalculator.provideReturnIndexByPosition(
                    returnPointX,
                    returnPointY
                );
                this.returnPointWriter.recordReturnPoint(
                    generatedReturnPoints,
                    pathLayerProperties,
                    'default-main-path',
                    {
                        mapIndex: returnPointIndex,
                        x: returnPointX,
                        y: returnPointY,
                        position
                    },
                    mapName,
                    'default-'+mapName
                );
            }
        }
        if(!placementFailed && 0 < generatedMainPathIndexesBorder.length){
            Logger.debug('Main path tiles.', generatedMainPathIndexesBorder, generatedMainPathIndexes);
            this.placeMainPathBorderIndexes(generatedMainPathIndexesBorder, pathLayerData, pathTile);
        }
        return {
            pathLayerData,
            generatedMainPathIndexes,
            generatedMainPathIndexesBorder,
            generatedReturnPoints,
            pathLayerProperties,
            hasAssociatedMap,
            mainPathStart,
            mainPathEdge: this.mainPathMirror.resolvePathEdge(generatedMainPathIndexes, mapWidth, mapHeight)
        };
    }

    placeExitMainPath(pathLayerData, mapGrid, mapWidth, mapHeight, entryEdge, mainPathSize, isBorderWalkable, pathTile)
    {
        let exitResult = this.generateRandomMainPath(mapWidth, mapHeight, mainPathSize, isBorderWalkable, entryEdge);
        if(0 === exitResult.generatedMainPathIndexes.length){
            return exitResult;
        }
        if(this.placeAllMainPathIndexes(exitResult.generatedMainPathIndexes, pathLayerData, mapGrid, pathTile)){
            Logger.critical('Could not place the exit main path.', exitResult.generatedMainPathIndexes);
            return false;
        }
        this.placeMainPathBorderIndexes(exitResult.generatedMainPathIndexesBorder, pathLayerData, pathTile);
        return exitResult;
    }

    placeMainPathBorderIndexes(generatedMainPathIndexesBorder, pathLayerData, pathTile)
    {
        for(let mainPathPointBorder of generatedMainPathIndexesBorder){
            pathLayerData[mainPathPointBorder.index] = pathTile;
        }
    }

    placeAllMainPathIndexes(generatedMainPathIndexes, pathLayerData, mapGrid, pathTile)
    {
        for(let mainPathPoint of generatedMainPathIndexes){
            let {index, y, x} = mainPathPoint;
            if(!this.placeMainPathIndex(index, y, x, pathLayerData, mapGrid, pathTile)){
                return true;
            }
        }
        return false;
    }

    determineReturnPointFromMainPath(generatedMainPathIndexes, mapWidth, mapHeight, blockMapBorder)
    {
        let position = 'down';
        let path = generatedMainPathIndexes[1] || generatedMainPathIndexes[0];
        if(!path){
            Logger.warning('Could not determine return point from main path.', generatedMainPathIndexes);
            return {returnPointX: 1, returnPointY: 1, position};
        }
        if(!blockMapBorder){
            return {returnPointX: path.x, returnPointY: path.y, position};
        }
        let returnPointX = 0 === path.x ? path.x + 1 : path.x;
        if(path.x === mapWidth - 1){
            returnPointX = mapWidth - 2;
        }
        let returnPointY = 0 === path.y ? path.y + 1 : path.y;
        if(path.y === mapHeight - 1){
            returnPointY = mapHeight - 2;
            position = 'up';
        }
        return {returnPointX, returnPointY, position};
    }

    generateRandomMainPath(mapWidth, mapHeight, mainPathSize, isBorderWalkable, excludedEdge)
    {
        if(0 === mainPathSize){
            return {
                mainPathStart: null,
                generatedMainPathIndexes: [],
                mainPathStartBorder: null,
                generatedMainPathIndexesBorder: [],
                edge: false
            };
        }
        let randomEdge = sc.randomValueFromArray(
            Object.keys(MainPathEdgesConstants)
                .map(edgeKey => MainPathEdgesConstants[edgeKey])
                .filter(edge => edge !== excludedEdge)
        );
        let walkableOffset = isBorderWalkable ? 0 : 1;
        let randomStartX = this.fitRandomStart(mapWidth, mainPathSize, walkableOffset);
        let randomStartY = this.fitRandomStart(mapHeight, mainPathSize, walkableOffset);
        let borderPathData = this.generateFullMainPathWithIndexes(
            0,
            randomEdge,
            randomStartX,
            randomStartY,
            mapWidth,
            mapHeight,
            mainPathSize
        );
        if(isBorderWalkable){
            return {
                mainPathStart: borderPathData.mainPathStart,
                generatedMainPathIndexes: borderPathData.generatedPathIndexes,
                mainPathStartBorder: null,
                generatedMainPathIndexesBorder: [],
                edge: randomEdge
            };
        }
        let notWalkableBorderPathData = this.generateFullMainPathWithIndexes(
            walkableOffset,
            randomEdge,
            randomStartX,
            randomStartY,
            mapWidth,
            mapHeight,
            mainPathSize
        );
        return {
            mainPathStart: notWalkableBorderPathData.mainPathStart,
            generatedMainPathIndexes: notWalkableBorderPathData.generatedPathIndexes,
            mainPathStartBorder: borderPathData.mainPathStart,
            generatedMainPathIndexesBorder: borderPathData.generatedPathIndexes,
            edge: randomEdge
        };
    }

    fitRandomStart(edgeLength, mainPathSize, walkableOffset)
    {
        let randomStart = Math.floor(Math.random() * (edgeLength - mainPathSize));
        return this.mainPathMirror.fitAlongPositions(
            [randomStart, randomStart + mainPathSize - 1],
            edgeLength,
            walkableOffset
        ).shift();
    }

    generateFullMainPathWithIndexes(
        walkableBorder,
        randomEdge,
        randomStartX,
        randomStartY,
        mapWidth,
        mapHeight,
        mainPathSize
    ){
        let firstWalkable = 0 + walkableBorder;
        let mainPathStart = {x: firstWalkable, y: firstWalkable};
        let lastWalkable = 1 + walkableBorder;
        switch(randomEdge){
            case 0:
                mainPathStart.x = randomStartX;
                mainPathStart.y = firstWalkable;
                break;
            case 1:
                mainPathStart.x = mapWidth - lastWalkable;
                mainPathStart.y = randomStartY;
                break;
            case 2:
                mainPathStart.x = randomStartX;
                mainPathStart.y = mapHeight - lastWalkable;
                break;
            case 3:
                mainPathStart.x = firstWalkable;
                mainPathStart.y = randomStartY;
                break;
        }
        let generatedPathIndexes = [];
        let plusOnX = MainPathEdgesConstants.TOP === randomEdge || MainPathEdgesConstants.BOTTOM === randomEdge;
        for(let i = 0; i < mainPathSize; i++){
            let x = mainPathStart.x;
            let y = mainPathStart.y;
            x += (plusOnX ? i : 0);
            y += (plusOnX ? 0 : i);
            let index = this.layerDataFactory.tileIndex(y, x, mapWidth);
            let mainPathIndexData = {index, x, y};
            generatedPathIndexes.push(mainPathIndexData);
        }
        return {mainPathStart, generatedPathIndexes};
    }

    placeMainPathIndex(index, y, x, pathLayerData, mapGrid, pathTile)
    {
        try {
            pathLayerData[index] = pathTile;
            this.mapGridBuilder.markMapGridPosition(mapGrid, y, x, false);
        } catch (error) {
            Logger.critical('Could not place main path tile.', index, y, x, error);
            return false;
        }
        return true;
    }

    markPathTilesAsUnavailable(splitBorderLayer, pathLayerData, mapGrid, mapWidth, mapHeight, splitBordersInLayers)
    {
        let pathFullLayerData = splitBordersInLayers ? splitBorderLayer : pathLayerData;
        this.layerDataFactory.forEachMapCell(mapWidth, mapHeight, (x, y, pointIndex) => {
            if(0 !== pathFullLayerData[pointIndex]){
                mapGrid[y][x] = false;
            }
        });
    }

}

module.exports.MainPathGenerator = MainPathGenerator;
