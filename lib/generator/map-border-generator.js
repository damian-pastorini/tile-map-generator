/**
 *
 * Reldens - MapBorderGenerator
 *
 */

const { MapBorderWallsDrawer } = require('./map-border-walls-drawer');
const { Logger, sc } = require('@reldens/utils');

class MapBorderGenerator
{

    constructor(generator)
    {
        this.generator = generator;
        this.borderTilesKey = 'map-border';
        this.wallsDrawer = new MapBorderWallsDrawer(generator, this.borderTilesKey);
    }

    populateCollisionsMapBorder()
    {
        if(!this.generator.blockMapBorder){
            return false;
        }
        this.drawAndBlockBorder();
        this.createEntryPosition();
    }

    drawAndBlockBorder()
    {
        this.drawBorderLayer();
        this.wallsDrawer.drawBorderInnerWalls();
        this.wallsDrawer.markBorderWallsAsNotWalkable();
        if(this.generator.isBorderWalkable){
            return false;
        }
        this.generator.mapGridBuilder.markBorderAsNotWalkable(
            this.generator.mapGrid,
            this.generator.mapWidth,
            this.generator.mapHeight
        );
        return true;
    }

    drawBorderLayer()
    {
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
    }

    redrawBorderForGrownMap()
    {
        if(!this.generator.blockMapBorder){
            return;
        }
        if(this.drawAndBlockBorder()){
            this.reapplyEntryPositionWalkability();
            this.reapplyEntryPositionOpening();
        }
    }

    reapplyEntryPositionOpening()
    {
        if('' === this.generator.entryPosition){
            return false;
        }
        let entryPositionParts = this.generator.entryPosition.split('-');
        if(2 !== entryPositionParts.length){
            return false;
        }
        let direction = entryPositionParts[0];
        let position = this.determinePositionInMap(direction, entryPositionParts[1]);
        if(null === position.x || null === position.y){
            return false;
        }
        for(let i = 0; i < this.generator.entryPositionSize; i++){
            this.generator.borderLayer[position.y * this.generator.mapWidth + position.x + i] = 0;
        }
        this.stampEntryPositionEnds(direction, position.x, position.y);
        this.wallsDrawer.openWallsForEntryPosition(direction, position.x, position.y);
        return true;
    }

    reapplyEntryPositionWalkability()
    {
        if('' === this.generator.entryPosition){
            return;
        }
        let entryPositionParts = this.generator.entryPosition.split('-');
        if(2 !== entryPositionParts.length){
            return;
        }
        let {x, y} = this.determinePositionInMap(entryPositionParts[0], entryPositionParts[1]);
        if(null === x || null === y){
            return;
        }
        for(let i = 0; i < this.generator.entryPositionSize; i++){
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, y, x + i, true);
        }
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
        this.stampEntryPositionEnds(direction, x, y);
        this.wallsDrawer.openWallsForEntryPosition(direction, x, y);
        let generatedLayer = this.generator.generateLayerWithData(
            'return-to-main-map-change-points',
            mainMapChangePointLayer
        );
        generatedLayer.properties = layerProperties;
        this.generator.additionalLayers.push(generatedLayer);
    }

    applyEntryPositionFrom(layerProperties, mapIndex, i, x, y, xReturn, yReturn, returnPointPosition)
    {
        if(!this.generator.entryPositionFrom){
            return;
        }
        this.generator.returnPointWriter.recordChangePoint(
            this.generator.generatedChangePoints,
            layerProperties,
            'return-to-main-map',
            {
                tileIndex: this.generator.groundTile,
                mapIndex,
                y,
                x
            },
            this.generator.entryPositionFrom
        );
        if(this.generator.generatedReturnPoints[this.generator.mapName]){
            return;
        }
        let returnPointMapIndex = yReturn * this.generator.mapWidth + xReturn + i;
        let pointName = this.generator.entryPositionFrom;
        this.generator.returnPointWriter.recordReturnPoint(
            this.generator.generatedReturnPoints,
            layerProperties,
            this.generator.mapName,
            {
                tileIndex: this.generator.groundTile,
                mapIndex: returnPointMapIndex,
                x: xReturn,
                y: yReturn,
                position: returnPointPosition
            },
            pointName,
            pointName,
            true
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

    stampEntryPositionEnds(direction, x, y)
    {
        let isTopBorder = 'top' === direction;
        let openingLeftEnd = this.fetchOpeningEndTile(isTopBorder, 'left');
        let openingRightEnd = this.fetchOpeningEndTile(isTopBorder, 'right');
        this.stampBorderEnd(y, x - 1, openingLeftEnd);
        this.stampBorderEnd(y, x + this.generator.entryPositionSize, openingRightEnd);
        return true;
    }

    fetchOpeningEndTile(isTopBorder, side)
    {
        let borderFamilyKey = isTopBorder ? 'top-' : 'bottom-';
        let innerFamilyKey = isTopBorder ? 'bottom-' : 'top-';
        let oppositeSide = 'left' === side ? 'right' : 'left';
        let innerCornerTile = sc.get(this.generator.borderInnerCornersTiles, innerFamilyKey+oppositeSide, 0);
        if(innerCornerTile){
            return innerCornerTile;
        }
        if(!this.validateBorderCorners()){
            return 0;
        }
        return this.generator.bordersTiles[borderFamilyKey+oppositeSide];
    }

    stampBorderEnd(row, column, endTile)
    {
        if(!endTile){
            return false;
        }
        if(0 >= column || column >= this.generator.mapWidth - 1){
            return false;
        }
        let mapIndex = row * this.generator.mapWidth + column;
        if(0 === this.generator.borderLayer[mapIndex]){
            return false;
        }
        this.generator.borderLayer[mapIndex] = endTile;
        return true;
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
