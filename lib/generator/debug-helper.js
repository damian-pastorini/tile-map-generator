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
        this.adjacentOffsets = this.generator.adjacentOffsets;
        this.debugPathsGrid = generator.debugPathsGrid;
        this.shouldDebugAdjacentSpots = generator.shouldDebugAdjacentSpots;
        this.generatedFolder = generator.generatedFolder;
        this.mapFileName = generator.mapFileName;
    }

    async writeDebugPathFinderFile(layers, layerNamePrefix = 'test-', debugLayerData)
    {
        if(!this.debugPathsGrid && debugLayerData){
            return;
        }
        let layersCloned = [...layers].filter(layers => layers.name !== 'ground-variations');
        layersCloned.push(this.generator.generateLayerWithData('path-finder-collisions', Object.values(debugLayerData)));
        await this.writeDebugFile(layersCloned, layerNamePrefix);
    }

    async debugAdjacentSpots(firstElementPosition, firstElementSize, elementFreeSpace, mapWidth, mapHeight)
    {
        if(!this.shouldDebugAdjacentSpots){
            return
        }
        let debugLayerData = Array(mapWidth * mapHeight).fill(0);
        let placementOffsets = this.adjacentOffsets.placementOffsets();
        let mapCenterX = Math.floor(mapWidth / 2);
        let mapCenterY = Math.floor(mapHeight / 2);
        let startX = firstElementPosition.x;
        let startY = firstElementPosition.y;
        let width = firstElementSize.width;
        let height = firstElementSize.height;
        let freeSpaceAround = elementFreeSpace;
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = (startY + y) * mapWidth + (startX + x);
                if(index >= 0 && index < debugLayerData.length){
                    debugLayerData[index] = 1;
                }
            }
        }
        for(let i = 0; i < placementOffsets.length; i++){
            let offsetNumber = i + 2;
            let offset = placementOffsets[i];
            let offsetX = offset.x * (width + freeSpaceAround * 2);
            let offsetY = offset.y * (height + freeSpaceAround * 2);
            let posX = mapCenterX - Math.floor(width / 2) + offsetX;
            let posY = mapCenterY - Math.floor(height / 2) + offsetY;
            for(let y = 0; y < height; y++){
                for(let x = 0; x < width; x++){
                    let index = (posY + y) * mapWidth + (posX + x);
                    if(index >= 0 && index < debugLayerData.length){
                        debugLayerData[index] = offsetNumber;
                    }
                }
            }
        }
        await this.writeDebugFile(
            [this.generator.generateLayerWithData('centered-elements-and-adjacent-spots', debugLayerData)],
            'test-centered-elements-and-adjacent-spots-'
        );
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
