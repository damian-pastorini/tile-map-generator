/**
 *
 * Reldens - Tile Map Generator - MainPathLinksWriter
 *
 * Links the chained main path openings to the previous and next maps. Each opening border cell is cleared from the
 * collisions map border, marked walkable and receives a "change-point-for-{target map}" property, and one
 * "return-point-for-{target map}" is recorded one tile inside the middle of the opening, so the importer creates
 * the rooms change points and return points between the chained maps.
 *
 */

const { MainPathEdgesConstants } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MainPathLinksWriter
{

    constructor(returnPointWriter, mapGridBuilder, layerDataFactory, mapBorderWallsDrawer)
    {
        this.returnPointWriter = returnPointWriter;
        this.mapGridBuilder = mapGridBuilder;
        this.layerDataFactory = layerDataFactory;
        this.mapBorderWallsDrawer = mapBorderWallsDrawer;
        this.recordKeyPrefix = 'main-path-link-';
        this.returnPointsByEdge = {
            [MainPathEdgesConstants.TOP]: {stepX: 0, stepY: 1, position: 'down'},
            [MainPathEdgesConstants.RIGHT]: {stepX: -1, stepY: 0, position: 'left'},
            [MainPathEdgesConstants.BOTTOM]: {stepX: 0, stepY: -1, position: 'up'},
            [MainPathEdgesConstants.LEFT]: {stepX: 1, stepY: 0, position: 'right'}
        };
    }

    writeLinks(openings, mapState)
    {
        let layerData = this.layerDataFactory.createEmptyLayerData(mapState.mapWidth, mapState.mapHeight);
        let layerProperties = [];
        for(let opening of openings){
            this.writeOpening(opening, mapState, layerData, layerProperties);
        }
        return {layerData, layerProperties};
    }

    writeOpening(opening, mapState, layerData, layerProperties)
    {
        let openingCells = mapState.isBorderWalkable ? opening.pathIndexes : opening.borderIndexes;
        if(0 === openingCells.length){
            Logger.critical('Main path link opening has no border cells.', opening.targetMapName);
            return false;
        }
        for(let openingCell of openingCells){
            this.openBorderCell(openingCell, mapState);
            layerData[openingCell.index] = mapState.groundTile;
            this.returnPointWriter.recordChangePoint(
                mapState.generatedChangePoints,
                layerProperties,
                this.recordKeyPrefix+opening.targetMapName,
                {tileIndex: mapState.groundTile, mapIndex: openingCell.index, y: openingCell.y, x: openingCell.x},
                opening.targetMapName
            );
        }
        if(MainPathEdgesConstants.TOP === opening.edge){
            let firstColumn = Math.min(...openingCells.map(openingCell => openingCell.x));
            this.mapBorderWallsDrawer.openWallsBelowTopBorder(firstColumn, openingCells.length, 0);
        }
        this.recordLinkReturnPoint(opening, openingCells, mapState, layerProperties);
        return true;
    }

    openBorderCell(openingCell, mapState)
    {
        if(sc.isArray(mapState.borderLayer)){
            mapState.borderLayer[openingCell.index] = 0;
        }
        this.mapGridBuilder.markMapGridPosition(mapState.mapGrid, openingCell.y, openingCell.x, true);
    }

    recordLinkReturnPoint(opening, openingCells, mapState, layerProperties)
    {
        let edgeReturnPoint = this.returnPointsByEdge[opening.edge];
        let middleCell = openingCells[Math.floor(openingCells.length / 2)];
        let x = middleCell.x + edgeReturnPoint.stepX;
        let y = middleCell.y + edgeReturnPoint.stepY;
        this.returnPointWriter.recordReturnPoint(
            mapState.generatedReturnPoints,
            layerProperties,
            this.recordKeyPrefix+opening.targetMapName,
            {
                tileIndex: mapState.groundTile,
                mapIndex: this.layerDataFactory.tileIndex(y, x, mapState.mapWidth),
                x,
                y,
                position: edgeReturnPoint.position
            },
            opening.targetMapName,
            opening.targetMapName,
            opening.isDefault
        );
    }

}

module.exports.MainPathLinksWriter = MainPathLinksWriter;
