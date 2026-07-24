/**
 *
 * Reldens - ElementLayerWriter
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ElementLayerWriter
{

    constructor(generator)
    {
        this.generator = generator;
        this.tilePositionCalculator = this.generator.tilePositionCalculator;
        this.elementLayerName = this.generator.elementLayerName;
    }

    updateLayerData(elementData, elementNumber, baseElementData, elementType)
    {
        if(-1 === this.generator.additionalLayers.findIndex(layer => elementData.name === layer.name)){
            Logger.warning('Layer index not found.', elementData.name);
            return;
        }
        let targetLayerName = this.elementLayerName.build(elementType, elementNumber, elementData.name);
        let layerIndex = this.generator.additionalLayers.findIndex(layer => targetLayerName === layer.name);
        if(-1 === layerIndex){
            let newLayer = this.generator.generateLayerWithData(
                targetLayerName,
                Array(this.generator.mapWidth * this.generator.mapHeight).fill(0)
            );
            let insertIndex = this.resolveElementLayerInsertIndex(elementType, elementNumber);
            this.generator.additionalLayers.splice(insertIndex, 0, newLayer);
            layerIndex = insertIndex;
        }
        let layer = this.generator.additionalLayers[layerIndex];
        Logger.debug('Update layer data: '+layer.name);
        layer.properties = elementData.properties;
        let mapPrefix = this.removeFloorFromMapName();
        let currentFloorNumber = Number(this.generator.fetchMapProperty('currentFloor').value || 0);
        let currentFloorKey = (this.generator.fetchMapProperty('floorKey').value || '').toString();
        let freeSpaceAround = sc.get(baseElementData, 'freeSpaceAround', 0);
        for(let row = 0; row < elementData.height; row++){
            for(let column = 0; column < elementData.width; column++){
                let tileIndex = row * elementData.width + column;
                let gridY = elementData.position.y + row;
                let gridX = elementData.position.x + column;
                let mapIndex = gridY * this.generator.mapWidth + gridX;
                this.markFreeSpaceAroundElementAsNotAvailable(
                    freeSpaceAround,
                    gridY,
                    gridX,
                    elementData.name,
                    elementData.allowPathsInFreeSpace
                );
                if(!this.generator.allowPlacePathOverElementsFreeArea){
                    this.generator.mapGrid[gridY][gridX] = false;
                }
                let isZeroTile = 0 === elementData.data[tileIndex];
                if(isZeroTile){
                    continue;
                }
                layer.data[mapIndex] = elementData.data[tileIndex];
                this.generator.mapGrid[gridY][gridX] = false;
                this.updateLayerChangePointsData(
                    layer,
                    mapPrefix,
                    elementData,
                    elementNumber,
                    currentFloorNumber,
                    currentFloorKey,
                    tileIndex,
                    mapIndex,
                    column,
                    row
                );
                this.updateLayerWithReturnPointsData(
                    layer,
                    mapPrefix,
                    elementData,
                    elementNumber,
                    currentFloorNumber,
                    currentFloorKey,
                    tileIndex,
                    column,
                    row,
                    gridX,
                    gridY
                );
            }
        }
    }

    resolveElementLayerInsertIndex(elementType, elementNumber)
    {
        let baseIndex = this.generator.additionalLayers.findIndex(layer => elementType === layer.name);
        if(-1 === baseIndex){
            return this.generator.additionalLayers.length;
        }
        let instancePrefix = elementType + elementNumber;
        let insertIndex = baseIndex + 1;
        for(let i = baseIndex + 1; i < this.generator.additionalLayers.length; i++){
            if(!this.generator.additionalLayers[i].name.startsWith(instancePrefix)){
                break;
            }
            insertIndex = i + 1;
        }
        return insertIndex;
    }

    markFreeSpaceAroundElementAsNotAvailable(freeSpaceAround, gridY, gridX, elementName, allowPathsInFreeSpace)
    {
        if(0 === freeSpaceAround){
            return;
        }
        let gridIndex = gridY *  this.generator.mapWidth + gridX;
        if(this.generator.pathTile === this.generator.pathLayerData[gridIndex]){
            return;
        }
        let pointSaveKey = gridY+'/'+gridX;
        if(-1 !== this.generator.temporalBlockedPositionsToAvoidElementsList.indexOf(pointSaveKey)){
            return;
        }
        for(let i = 1; i <= freeSpaceAround; i++){
            let previousTileY = gridY - freeSpaceAround;
            let previousTileX = gridX - freeSpaceAround;
            let nextTileY = gridY + freeSpaceAround;
            let nextTileX = gridX + freeSpaceAround;
            let savePoint = {previousTileY, previousTileX, nextTileY, nextTileX, elementName, allowPathsInFreeSpace};
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, previousTileY, previousTileX, false);
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, previousTileY, nextTileX, false);
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, nextTileY, previousTileX, false);
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, nextTileY, nextTileX, false);
            this.generator.temporalBlockedPositionsToAvoidElements.push(savePoint);
            this.generator.temporalBlockedPositionsToAvoidElementsList.push(pointSaveKey);
        }
    }

    updateLayerChangePointsData(
        layer,
        mapPrefix,
        elementData,
        elementNumber,
        currentFloorNumber,
        currentFloorKey,
        tileIndex,
        mapIndex,
        x,
        y
    ){
        let isChangePointsLayer = -1 !== layer.name.indexOf('change-points');
        if(!isChangePointsLayer){
            return;
        }
        let elementKey = this.provideElementKey(
            mapPrefix,
            elementData,
            elementNumber,
            currentFloorNumber,
            currentFloorKey
        );
        let elementExists = sc.hasOwn(this.generator.generatedChangePoints, elementKey);
        if(elementExists){
            return;
        }
        if(!layer.properties){
            layer.properties = [];
        }
        this.generator.returnPointWriter.recordChangePoint(
            this.generator.generatedChangePoints,
            layer.properties,
            elementKey,
            {
                elementData,
                targetLayerName: layer.name,
                tileIndex,
                mapIndex,
                elementNumber,
                x,
                y
            },
            elementKey
        );
    }

    updateLayerWithReturnPointsData(
        layer,
        mapPrefix,
        elementData,
        elementNumber,
        currentFloorNumber,
        currentFloorKey,
        tileIndex,
        x,
        y,
        gridX,
        gridY
    ){
        if(0 === tileIndex){
            return;
        }
        let isReturnPointLayer = -1 !== layer.name.indexOf('return-point');
        if(!isReturnPointLayer){
            return;
        }
        let elementKey = this.provideElementKey(
            mapPrefix,
            elementData,
            elementNumber,
            currentFloorNumber,
            currentFloorKey
        );
        let elementExists = sc.hasOwn(this.generator.generatedReturnPoints, elementKey);
        if(elementExists){
            return;
        }
        let returnPointPosition = this.provideReturnPositionKeyFromLayer(layer);
        let returnPointIndex = this.tilePositionCalculator.provideReturnIndexByPosition(x, y, elementData);
        this.generator.returnPointWriter.recordReturnPoint(
            this.generator.generatedReturnPoints,
            this.generator.pathLayerProperties,
            elementKey,
            {
                tileIndex,
                mapIndex: returnPointIndex,
                x: gridX,
                y: gridY,
                position: returnPointPosition
            },
            elementKey,
            elementKey
        );
    }

    provideReturnPositionKeyFromLayer(layer)
    {
        let defaultPosition = 'down';
        if(!layer || !layer.properties){
            return defaultPosition;
        }
        for(let property of layer.properties){
            if('position' === property.name){
                return property.value;
            }
        }
        return defaultPosition;
    }

    provideElementKey(mapPrefix, elementData, elementNumber, currentFloorNumber, currentFloorKey)
    {
        let elementKey = mapPrefix.toString();
        let elementNameClean = elementData.name.replace('-change-points', '').replace('-return-point', '');
        let isStairsElement = -1 !== elementData.name.indexOf('stairs');
        if(!isStairsElement){
            return elementKey + '-' + elementNameClean + '-n' + elementNumber;
        }
        let upperFloorString = '';
        let downFloorString = '';
        if(0 === currentFloorNumber){
            upperFloorString = '-upperFloor-n1';
            downFloorString = '-downFloor-n1';
        }
        if(1 === currentFloorNumber){
            if('upper' === currentFloorKey){
                upperFloorString = '-upperFloor-n2';
                downFloorString = '';
            }
            if('down' === currentFloorKey){
                upperFloorString = '';
                downFloorString = '-downFloor-n2';
            }
        }
        if(1 < currentFloorNumber){
            let nextUpperFloor = currentFloorNumber + 1;
            let nextDownFloor = currentFloorNumber - 1;
            upperFloorString = this.generator.mapNaming.buildFloorSuffix(currentFloorKey, nextUpperFloor);
            downFloorString = this.generator.mapNaming.buildFloorSuffix(currentFloorKey, nextDownFloor);
        }
        return elementKey + elementNameClean
            .replace('stairs-up', upperFloorString)
            .replace('stairs-down', downFloorString);
    }

    removeFloorFromMapName()
    {
        let mapNameParts = this.generator.mapName.toString().split('-upperFloor-n');
        mapNameParts = mapNameParts[0].split('-downFloor-n');
        return mapNameParts[0];
    }


}

module.exports.ElementLayerWriter = ElementLayerWriter;
