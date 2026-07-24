/**
 *
 * Reldens - Tile Map Generator - MainPathGenerator
 *
 */

const { Logger } = require('@reldens/utils');

class MainPathGenerator
{

    constructor(tilePositionCalculator, returnPointWriter, layerDataFactory, mapGridBuilder)
    {
        this.tilePositionCalculator = tilePositionCalculator;
        this.returnPointWriter = returnPointWriter;
        this.layerDataFactory = layerDataFactory;
        this.mapGridBuilder = mapGridBuilder;
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
        mainPathSize,
        isBorderWalkable,
        blockMapBorder,
        mapName,
        pathTile
    ){
        if(0 < previousMainPath.length){
            let oppositeResult = this.generateOppositeMainPath(
                previousMainPath,
                mapWidth,
                mapHeight
            );
            generatedMainPathIndexes = oppositeResult.generatedMainPathIndexes;
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
            if(!placementFailed && !generatedReturnPoints['default-main-path']){
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
            for(let mainPathPointBorder of generatedMainPathIndexesBorder){
                pathLayerData[mainPathPointBorder.index] = pathTile;
            }
        }
        return {
            pathLayerData,
            generatedMainPathIndexes,
            generatedMainPathIndexesBorder,
            generatedReturnPoints,
            pathLayerProperties,
            hasAssociatedMap,
            mainPathStart
        };
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
        let returnPointY = 0 === path.y ? path.x + 1 : path.y;
        if(path.y === mapHeight - 1){
            returnPointY = mapHeight - 2;
            position = 'up';
        }
        return {returnPointX, returnPointY, position};
    }

    generateRandomMainPath(mapWidth, mapHeight, mainPathSize, isBorderWalkable)
    {
        if(0 === mainPathSize){
            return {
                mainPathStart: null,
                generatedMainPathIndexes: [],
                mainPathStartBorder: null,
                generatedMainPathIndexesBorder: []
            };
        }
        let randomEdge = Math.floor(Math.random() * 4);
        let randomStartX = Math.floor(Math.random() * (mapWidth - mainPathSize));
        let randomStartY = Math.floor(Math.random() * (mapHeight - mainPathSize));
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
                generatedMainPathIndexesBorder: []
            };
        }
        let notWalkableBorderPathData = this.generateFullMainPathWithIndexes(
            1,
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
            generatedMainPathIndexesBorder: borderPathData.generatedPathIndexes
        };
    }

    generateOppositeMainPath(previousMainPath, mapWidth, mapHeight)
    {
        let previousPathMiddleTile = Math.ceil(previousMainPath.length / 2);
        let referenceY = previousMainPath[previousPathMiddleTile].y;
        let shouldFlipVertically = 0 === referenceY || mapHeight - 1 === referenceY;
        let generatedMainPathIndexes = [];
        for(let i = 0; i < previousMainPath.length; i++){
            let x = previousMainPath[i].x;
            if(!shouldFlipVertically){
                x = 0 === x ? mapWidth - 1 : 0;
            }
            let y = previousMainPath[i].y;
            if(shouldFlipVertically){
                y = 0 === y ? mapHeight - 1 : 0;
            }
            let index = this.layerDataFactory.tileIndex(y, x, mapWidth);
            generatedMainPathIndexes.push({index, x, y});
        }
        return {
            generatedMainPathIndexes,
            hasAssociatedMap: true,
            mainPathStart: this.provideOppositeMainPathStart(generatedMainPathIndexes, mapWidth, mapHeight)
        };
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
        for(let i = 0; i < mainPathSize; i++){
            let x = mainPathStart.x;
            let y = mainPathStart.y;
            let plusOnX = firstWalkable === mainPathStart.y || mainPathStart.y === mapHeight - lastWalkable;
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
