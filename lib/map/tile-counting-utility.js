/**
 *
 * Reldens - Tile Map Generator - TileCountingUtility
 *
 */

const { sc } = require('@reldens/utils');

class TileCountingUtility
{

    static countTilesInLayer(layerData, targetTileOrPredicate)
    {
        if(!sc.isArray(layerData)){
            return 0;
        }
        let count = 0;
        let isFunction = 'function' === typeof targetTileOrPredicate;
        for(let tile of layerData){
            let matches = isFunction ? targetTileOrPredicate(tile) : tile === targetTileOrPredicate;
            if(matches){
                count++;
            }
        }
        return count;
    }

    static countNonZeroTiles(layerData)
    {
        return this.countTilesInLayer(layerData, tile => 0 !== tile);
    }

    static countZeroTiles(layerData)
    {
        return this.countTilesInLayer(layerData, 0);
    }

    static countTilesFromSet(layerData, tileSet)
    {
        if(!sc.isArray(layerData) || !sc.isArray(tileSet)){
            return 0;
        }
        let count = 0;
        for(let tile of layerData){
            if(-1 !== tileSet.indexOf(tile)){
                count++;
            }
        }
        return count;
    }

    static countAvailableGroundTiles(pathLayerData, groundTile)
    {
        if(!sc.isArray(pathLayerData)){
            return 0;
        }
        let groundTileCount = 0;
        for(let tile of pathLayerData){
            if(0 === tile){
                groundTileCount++;
            }
        }
        return groundTileCount;
    }

    static countVariationTiles(variationsLayerData, randomGroundTiles)
    {
        return this.countTilesFromSet(variationsLayerData, randomGroundTiles);
    }

    static countSpotsInMap(map, spotKey)
    {
        let layers = sc.get(map, 'layers', []);
        let spotCount = 0;
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 !== layerName.indexOf(spotKey)){
                let layerData = sc.get(layer, 'data', []);
                let hasNonZeroTiles = layerData.some(tile => 0 !== tile);
                if(hasNonZeroTiles){
                    spotCount++;
                }
            }
        }
        return spotCount;
    }

}

module.exports.TileCountingUtility = TileCountingUtility;
