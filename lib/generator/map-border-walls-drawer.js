/**
 *
 * Reldens - MapBorderWallsDrawer
 *
 * Draws the inner walls that hang below the map top border and opens them where the entry position cuts through.
 * A top border opening would otherwise be sealed by the wall drawn right below it, so the wall tiles over the
 * opening columns are cleared, their grid positions are marked walkable again, and the inner walls patterns are
 * applied a second time so the two new run ends get their end tiles.
 *
 */

const { PropertiesMapper } = require('./properties-mapper');
const { TilesShortcuts } = require('../map/tiles-shortcuts');
const { Logger, sc } = require('@reldens/utils');

class MapBorderWallsDrawer
{

    constructor(generator, borderTilesKey)
    {
        this.generator = generator;
        this.borderTilesKey = borderTilesKey;
        this.innerWallsTilesShortcuts = null;
    }

    drawBorderInnerWalls()
    {
        this.generator.borderWallsLayer = false;
        this.innerWallsTilesShortcuts = null;
        if(!this.generator.applyMapBorderInnerWalls){
            return false;
        }
        Logger.info('Walls creation started.');
        let borderTilesShortcuts = this.buildBorderTilesShortcuts();
        this.innerWallsTilesShortcuts = this.generator.tileShortcutsMapper.mapTilesShortcuts(
            this.borderTilesKey,
            borderTilesShortcuts.p,
            null,
            '-inner-walls'
        );
        this.generator.borderWallsLayer = this.generator.wallsGenerator.createLayerInnerWalls(
            this.generator.borderLayer,
            this.borderTilesKey,
            borderTilesShortcuts,
            this.generator.mapWidth,
            this.generator.mapHeight
        );
        this.applyInnerWallsPatterns();
        Logger.info('Walls applied.');
        return true;
    }

    applyInnerWallsPatterns()
    {
        this.generator.wallsGenerator.fixInnerWallsPatterns(
            this.generator.borderWallsLayer,
            this.innerWallsTilesShortcuts,
            this.generator.mapWidth
        );
    }

    openWallsForEntryPosition(direction, x, y)
    {
        if('top' !== direction){
            return false;
        }
        if(!sc.isArray(this.generator.borderWallsLayer)){
            return false;
        }
        for(let i = 0; i < this.generator.entryPositionSize; i++){
            this.clearWallPosition(y + 1, x + i);
            this.clearWallPosition(y + 2, x + i);
        }
        this.applyInnerWallsPatterns();
        return true;
    }

    clearWallPosition(row, column)
    {
        this.generator.borderWallsLayer[row * this.generator.mapWidth + column] = 0;
        this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, row, column, true);
    }

    buildBorderTilesShortcuts()
    {
        let propertiesMapper = new PropertiesMapper(this.borderTilesKey);
        let bordersTiles = this.generator.bordersTiles;
        propertiesMapper.mapSurroundingByKey(this.borderTilesKey+'-top-center', bordersTiles['top']);
        propertiesMapper.mapCornersByKey(this.borderTilesKey+'-top-left', bordersTiles['top-left']);
        propertiesMapper.mapCornersByKey(this.borderTilesKey+'-top-right', bordersTiles['top-right']);
        propertiesMapper.map();
        return new TilesShortcuts(
            this.generator.groundTile,
            propertiesMapper.surroundingTilesPosition,
            propertiesMapper.cornersPosition,
            this.borderTilesKey+'-'
        );
    }

    markBorderWallsAsNotWalkable()
    {
        if(!sc.isArray(this.generator.borderWallsLayer)){
            return false;
        }
        for(let tileIndex = 0; tileIndex < this.generator.borderWallsLayer.length; tileIndex++){
            this.markBorderWallPosition(tileIndex);
        }
        return true;
    }

    markBorderWallPosition(tileIndex)
    {
        if(0 === this.generator.borderWallsLayer[tileIndex]){
            return false;
        }
        let position = this.generator.layerDataFactory.rowAndColumnByTileIndex(tileIndex, this.generator.mapWidth);
        this.generator.mapGridBuilder.markMapGridPosition(
            this.generator.mapGrid,
            position.row,
            position.column,
            false
        );
        return true;
    }

}

module.exports.MapBorderWallsDrawer = MapBorderWallsDrawer;
