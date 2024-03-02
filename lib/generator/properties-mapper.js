/**
 *
 * Reldens - Tile Map Generator - PropertiesMapper
 *
 */

class PropertiesMapper
{

    constructor()
    {
        this.surroundingTiles = {};
        this.corners = {};
        this.surroundingTilesPosition = {};
        this.cornersPosition = {};
        this.surroundingTilesByKey = {
            'top-left': '-1,-1',
            'top-center': '-1,0',
            'top-right': '-1,1',
            'middle-left': '0,-1',
            'middle-center': '0,0',
            'middle-right': '0,1',
            'bottom-left': '1,-1',
            'bottom-center': '1,0',
            'bottom-right': '1,1'
        };
        this.cornersTilesByKey = {
            'top-left': '-1,-1',
            'top-right': '-1,1',
            'bottom-left': '1,-1',
            'bottom-right': '1,1'
        };
        this.surroundingTilesByPosition = {
            '-1,-1': 'top-left',
            '-1,0': 'top-center',
            '-1,1': 'top-right',
            '0,-1': 'middle-left',
            '0,1': 'middle-right',
            '0,0': 'middle-center',
            '1,-1': 'bottom-left',
            '1,0': 'bottom-center',
            '1,1': 'bottom-right'
        };
        this.cornersTilesByPosition = {
            '-1,-1': 'top-left',
            '-1,1': 'top-right',
            '1,-1': 'bottom-left',
            '1,1': 'bottom-right'
        };
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
