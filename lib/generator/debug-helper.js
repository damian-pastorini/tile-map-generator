/**
 *
 * Reldens - DebugHelper
 *
 */

const { JsonFormatter } = require('../map/json-formatter');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class DebugHelper
{

    constructor(generator)
    {
        this.generator = generator;
        this.debugPathsGrid = generator.debugPathsGrid;
        this.shouldDebugAdjacentSpots = generator.shouldDebugAdjacentSpots;
        this.generatedFolder = generator.generatedFolder;
        this.mapFileName = generator.mapFileName;
    }

    async writeDebugPathFinderFile(layers, layerNamePrefix = 'test-', debugLayerData)
    {
        if(!this.debugPathsGrid){
            return;
        }
        if(!debugLayerData){
            return;
        }
        let layersCloned = [...layers].filter(layers => layers.name !== 'ground-variations');
        let debugTiles = [];
        for(let tileIndex of Object.keys(debugLayerData)){
            debugTiles.push(debugLayerData[tileIndex]);
        }
        layersCloned.push(this.generator.generateLayerWithData('path-finder-collisions', debugTiles));
        await this.writeDebugFile(layersCloned, layerNamePrefix);
    }

    async debugAdjacentSpots(firstElementPosition, firstElementSize, elementFreeSpace, mapWidth, mapHeight)
    {
        if(!this.shouldDebugAdjacentSpots){
            return
        }
        let debugLayerData = this.generator.layerDataFactory.createEmptyLayerData(mapWidth, mapHeight);
        let placementOffsets = this.generator.geometryCalculator.placementOffsets();
        let mapCenterX = Math.floor(mapWidth / 2);
        let mapCenterY = Math.floor(mapHeight / 2);
        let startX = firstElementPosition.x;
        let startY = firstElementPosition.y;
        let width = firstElementSize.width;
        let height = firstElementSize.height;
        let freeSpaceAround = elementFreeSpace;
        this.paintDebugRectangle(debugLayerData, startX, startY, width, height, 1, mapWidth);
        for(let i = 0; i < placementOffsets.length; i++){
            let offsetNumber = i + 2;
            let offset = placementOffsets[i];
            let offsetX = offset.x * (width + freeSpaceAround * 2);
            let offsetY = offset.y * (height + freeSpaceAround * 2);
            let posX = mapCenterX - Math.floor(width / 2) + offsetX;
            let posY = mapCenterY - Math.floor(height / 2) + offsetY;
            this.paintDebugRectangle(debugLayerData, posX, posY, width, height, offsetNumber, mapWidth);
        }
        await this.writeDebugFile(
            [this.generator.generateLayerWithData('centered-elements-and-adjacent-spots', debugLayerData)],
            'test-centered-elements-and-adjacent-spots-'
        );
    }

    paintDebugRectangle(debugLayerData, startX, startY, width, height, tileValue, mapWidth)
    {
        for(let row = 0; row < height; row++){
            this.paintDebugRectangleRow(debugLayerData, startX, startY + row, width, tileValue, mapWidth);
        }
    }

    paintDebugRectangleRow(debugLayerData, startX, rowY, width, tileValue, mapWidth)
    {
        for(let column = 0; column < width; column++){
            let index = this.generator.layerDataFactory.tileIndex(rowY, startX + column, mapWidth);
            if(0 > index){
                continue;
            }
            if(index >= debugLayerData.length){
                continue;
            }
            debugLayerData[index] = tileValue;
        }
    }

    async writeDebugFile(layersData, layerNamePrefix, width = 0, height = 0)
    {
        let testMapName = FileHandler.joinPaths(this.generatedFolder, layerNamePrefix + this.mapFileName);
        Logger.debug('Creating test map: ' + testMapName);
        let testMapObject = this.generator.createTiledMapObject(layersData, width, height);
        FileHandler.writeFile(testMapName, JsonFormatter.mapToJSON(testMapObject));
    }

}

module.exports.DebugHelper = DebugHelper;
