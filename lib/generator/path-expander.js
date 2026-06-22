/**
 *
 * Reldens - Tile Map Generator - PathExpander
 *
 */

class PathExpander
{

    constructor(layerDataFactory, mapGridBuilder)
    {
        this.layerDataFactory = layerDataFactory;
        this.mapGridBuilder = mapGridBuilder;
        this.directions = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0]
        ];
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.additionalLayers = [];
        this.mapGrid = [];
        this.pathTile = 0;
    }

    expand(pathLayerData, mapWidth, mapHeight, additionalLayers, mapGrid, pathSize, pathTile)
    {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.additionalLayers = additionalLayers;
        this.mapGrid = mapGrid;
        this.pathTile = pathTile;
        for(let level = 1; level < pathSize; level++){
            pathLayerData = this.expandOneLevel(pathLayerData);
        }
        return pathLayerData;
    }

    expandOneLevel(pathLayerData)
    {
        let tempPathLayerData = [...pathLayerData];
        this.layerDataFactory.forEachMapCell(this.mapWidth, this.mapHeight, (x, y, pointIndex) => {
            if(this.pathTile !== pathLayerData[pointIndex]){
                return;
            }
            this.expandCellNeighbors(tempPathLayerData, pathLayerData, x, y);
        });
        return tempPathLayerData;
    }

    expandCellNeighbors(tempPathLayerData, pathLayerData, x, y)
    {
        for(let direction of this.directions){
            let newX = x + direction[0];
            let newY = y + direction[1];
            if(0 > newX || this.mapWidth <= newX || 0 > newY || this.mapHeight <= newY){
                continue;
            }
            let newPointIndex = this.layerDataFactory.tileIndex(newY, newX, this.mapWidth);
            if(this.canExpandToNeighbor(pathLayerData, newPointIndex, newX, newY)){
                tempPathLayerData[newPointIndex] = this.pathTile;
            }
        }
    }

    canExpandToNeighbor(pathLayerData, newPointIndex, newX, newY)
    {
        if(!this.mapGrid[newY][newX]){
            return false;
        }
        if(this.pathTile === pathLayerData[newPointIndex]){
            return false;
        }
        return !this.mapGridBuilder.isOccupiedByAnotherCollision(
            newX,
            newY,
            this.additionalLayers,
            this.additionalLayers
        );
    }

}

module.exports.PathExpander = PathExpander;
