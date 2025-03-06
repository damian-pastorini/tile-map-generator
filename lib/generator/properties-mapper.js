/**
 *
 * Reldens - Tile Map Generator - PropertiesMapper
 *
 */

class PropertiesMapper
{

    constructor(mapperPrefix)
    {
        this.mapperPrefix = '';
        if(mapperPrefix){
            this.mapperPrefix = mapperPrefix+'-';
        }
        this.surroundingTiles = {};
        this.corners = {};
        this.surroundingTilesPosition = {};
        this.cornersPosition = {};
        this.surroundingTilesByKey = {
            [this.mapperPrefix+'top-left']: '-1,-1',
            [this.mapperPrefix+'top-center']: '-1,0',
            [this.mapperPrefix+'top-right']: '-1,1',
            [this.mapperPrefix+'middle-left']: '0,-1',
            [this.mapperPrefix+'middle-center']: '0,0',
            [this.mapperPrefix+'middle-right']: '0,1',
            [this.mapperPrefix+'bottom-left']: '1,-1',
            [this.mapperPrefix+'bottom-center']: '1,0',
            [this.mapperPrefix+'bottom-right']: '1,1'
        };
        this.cornersTilesByKey = {
            [this.mapperPrefix+'top-left']: '-1,-1',
            [this.mapperPrefix+'top-right']: '-1,1',
            [this.mapperPrefix+'bottom-left']: '1,-1',
            [this.mapperPrefix+'bottom-right']: '1,1'
        };
        this.surroundingTilesByPosition = {
            '-1,-1': this.mapperPrefix+'top-left',
            '-1,0': this.mapperPrefix+'top-center',
            '-1,1': this.mapperPrefix+'top-right',
            '0,-1': this.mapperPrefix+'middle-left',
            '0,1': this.mapperPrefix+'middle-right',
            '0,0': this.mapperPrefix+'middle-center',
            '1,-1': this.mapperPrefix+'bottom-left',
            '1,0': this.mapperPrefix+'bottom-center',
            '1,1': this.mapperPrefix+'bottom-right'
        };
        this.cornersTilesByPosition = {
            '-1,-1': this.mapperPrefix+'top-left',
            '-1,1': this.mapperPrefix+'top-right',
            '1,-1': this.mapperPrefix+'bottom-left',
            '1,1': this.mapperPrefix+'bottom-right'
        };
    }

    populateWithCornerTiles(corners = {})
    {
        let cornersKeys = Object.keys(corners);
        if(0 === cornersKeys.length){
            return;
        }
        for(let position of cornersKeys){
            let tile = corners[position];
            this.mapCornersByPosition(position, tile);
        }
    }

    populateWithSurroundingTiles(surroundingTiles = {})
    {
        let surroundingTilesKeys = Object.keys(surroundingTiles);
        if(0 === surroundingTilesKeys.length){
            return;
        }
        for(let position of surroundingTilesKeys){
            let tile = surroundingTiles[position.toString()];
            this.mapSurroundingByPosition(position, tile);
        }
    }

    mapSurroundingByPosition(position, value)
    {
        if(this.surroundingTilesByPosition[position]){
            this.surroundingTilesPosition[this.surroundingTilesByPosition[position]] = value;
        }
    }

    mapCornersByPosition(position, value)
    {
        if(this.cornersTilesByPosition[position]){
            this.cornersPosition[this.cornersTilesByPosition[position]] = value;
        }
    }

    mapSurroundingByKey(key, value)
    {
        if(this.surroundingTilesByKey[key]){
            this.surroundingTiles[this.surroundingTilesByKey[key]] = value;
        }
    }

    mapCornersByKey(key, value)
    {
        if(this.cornersTilesByKey[key]){
            this.corners[this.cornersTilesByKey[key]] = value;
        }
    }

    reset()
    {
        this.surroundingTiles = {};
        this.corners = {};
        this.surroundingTilesPosition = {};
        this.cornersPosition = {};
    }

}

module.exports.PropertiesMapper = PropertiesMapper;
