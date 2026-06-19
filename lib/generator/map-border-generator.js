/**
 *
 * Reldens - MapBorderGenerator
 *
 */

const { Logger } = require('@reldens/utils');

class MapBorderGenerator
{

    constructor(generator)
    {
        this.generator = generator;
    }

    populateCollisionsMapBorder()
    {
        if(!this.generator.blockMapBorder){
            return false;
        }
        this.generator.borderLayer = Array(this.generator.mapWidth * this.generator.mapHeight).fill(0);
        let borderTile = this.generator.borderTile || this.generator.groundTile;
        let bottomLeftIndex = (this.generator.mapHeight - 1) * this.generator.mapWidth;
        for(let column = 0; column < this.generator.mapWidth; column++){
            this.generator.borderLayer[column] = this.generator.bordersTiles['top'] || borderTile;
            this.generator.borderLayer[bottomLeftIndex+column] = this.generator.bordersTiles['bottom'] || borderTile;
        }
        let rightIndex = this.generator.mapWidth - 1;
        for(let row = 0; row < this.generator.mapHeight; row++){
            let leftIndex = row * this.generator.mapWidth;
            this.generator.borderLayer[leftIndex] = this.generator.bordersTiles['left'] || borderTile;
            this.generator.borderLayer[leftIndex + rightIndex] = this.generator.bordersTiles['right'] || borderTile;
        }
        if(this.validateBorderCorners()){
            this.generator.borderLayer[0] = this.generator.bordersTiles['top-left'];
            this.generator.borderLayer[rightIndex] = this.generator.bordersTiles['top-right'];
            this.generator.borderLayer[bottomLeftIndex] = this.generator.bordersTiles['bottom-left'];
            this.generator.borderLayer[bottomLeftIndex + rightIndex] = this.generator.bordersTiles['bottom-right'];
        }
        if(!this.generator.isBorderWalkable){
            this.generator.mapGridBuilder.markBorderAsNotWalkable(
                this.generator.mapGrid,
                this.generator.mapWidth,
                this.generator.mapHeight
            );
        }
        this.createEntryPosition();
    }

    createEntryPosition()
    {
        if('' === this.generator.entryPosition){
            return;
        }
        let entryPositionParts = this.generator.entryPosition.split('-');
        if(2 !== entryPositionParts.length){
            Logger.critical('Could not create entry position.', this.generator.entryPosition);
            return;
        }
        let direction = entryPositionParts[0];
        let position = entryPositionParts[1];
        let {x, y, xReturn, yReturn, returnPointPosition} = this.determinePositionInMap(direction, position);
        if(null === x || null === y){
            Logger.critical('Invalid entry position data.', {entryPosition: this.generator.entryPosition, x, y});
            return;
        }
        let mainMapChangePointLayer = Array(this.generator.mapWidth * this.generator.mapHeight).fill(0);
        let layerProperties = [];
        for(let i = 0; i < this.generator.entryPositionSize; i++){
            let mapIndex = y * this.generator.mapWidth + x + i;
            this.generator.borderLayer[mapIndex] = 0;
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, y, x + i, true);
            mainMapChangePointLayer[mapIndex] = this.generator.groundTile;
            this.applyEntryPositionFrom(layerProperties, mapIndex, i, x, y, xReturn, yReturn, returnPointPosition);
        }
        let generatedLayer = this.generator.generateLayerWithData('return-to-main-map-change-points', mainMapChangePointLayer);
        generatedLayer.properties = layerProperties;
        this.generator.additionalLayers.push(generatedLayer);
    }

    applyEntryPositionFrom(layerProperties, mapIndex, i, x, y, xReturn, yReturn, returnPointPosition)
    {
        if(!this.generator.entryPositionFrom){
            return;
        }
        this.generator.generatedChangePoints['return-to-main-map'] = {
            tileIndex: this.generator.groundTile,
            mapIndex,
            y,
            x
        };
        layerProperties.push({
            name: 'change-point-for-'+this.generator.entryPositionFrom,
            type: 'int',
            value: mapIndex
        });
        if(this.generator.generatedReturnPoints[this.generator.mapName]){
            return;
        }
        let returnPointMapIndex = yReturn * this.generator.mapWidth + xReturn + i;
        this.generator.generatedReturnPoints[this.generator.mapName] = {
            tileIndex: this.generator.groundTile,
            mapIndex: returnPointMapIndex,
            x: xReturn,
            y: yReturn,
            position: returnPointPosition
        };
        let prefix = 'return-point-';
        let pointName = this.generator.entryPositionFrom;
        let type = 'int';
        layerProperties.push(
            {name: prefix+'for-'+pointName, type, value: returnPointMapIndex},
            {name: prefix+'x-'+pointName, type, value: xReturn},
            {name: prefix+'y-'+pointName, type, value: yReturn},
            {name: prefix+'position-'+pointName, type: 'string', value: returnPointPosition},
            {name: prefix+'isDefault-'+pointName, type: 'bool', value: true}
        );
    }

    determinePositionInMap(direction, position)
    {
        let x = null;
        let y = null;
        let yReturn = null;
        let returnPointPosition = 'down';
        if('top' === direction){
            y = 0;
            yReturn = 1;
        }
        if('down' === direction){
            y = this.generator.mapHeight - 1;
            yReturn = this.generator.mapHeight - 2;
            returnPointPosition = 'up';
        }
        if('left' === position){
            x = 1;
        }
        if('middle' === position){
            x = Math.floor(this.generator.mapWidth / 2) - Math.floor(this.generator.entryPositionSize / 2);
        }
        if('right' === position){
            x = this.generator.mapWidth - 1 - this.generator.entryPositionSize;
        }
        return {x, y, xReturn: x, yReturn, returnPointPosition};
    }

    validateBorderCorners()
    {
        let corners = this.generator.bordersTiles;
        if(!corners['top-left'] || !corners['top-right']){
            return false;
        }
        return corners['bottom-left'] && corners['bottom-right'];
    }

}

module.exports.MapBorderGenerator = MapBorderGenerator;
