/**
 *
 * Reldens - WangsetMapper
 *
 */

const { WangsetPositions } = require('./wangset-positions');
const { sc } = require('@reldens/utils');

class WangsetMapper
{

    constructor(wangset)
    {
        this.debugData = {};
        this.wangsetName = wangset.name;
        this.wangsetFirstgid = wangset.firstgid;
        this.surroundingTilesPosition = {};
        this.cornersPosition = {};
        this.mainTile = 0;
        // these values are determined on the tiled map editor app and should be always the same format:
        this.mappedWangIdsByKeys = WangsetPositions.joinWangIds(WangsetPositions.surroundingWangIds());
        this.mappedPositionsByWangIds = this.invertMap(this.mappedWangIdsByKeys);
        this.mappedWangIdsByKeysCorners = WangsetPositions.joinWangIds(WangsetPositions.cornersWangIds());
        this.mappedPositionsByWangIdsCorners = this.invertMap(this.mappedWangIdsByKeysCorners);
        this.topCenter = this.fetchTopCenterTile(wangset);
        this.mapPositionsFromWangset(wangset);
    }

    invertMap(source)
    {
        let inverted = {};
        for(let key of Object.keys(source)){
            inverted[source[key]] = key;
        }
        return inverted;
    }

    fetchTopCenterTile(wangset)
    {
        let tilesProperties = wangset.tilesProperties;
        if(!sc.isArray(tilesProperties)){
            return 0;
        }
        let topCenterTiles = tilesProperties.filter((tileProperty) => {
            let properties = tileProperty.properties;
            if(!sc.isArray(properties)){
                return false;
            }
            return 0 < properties.filter(
                (property) => {
                    return property.name === 'key' && property.value === 'top-center'
                }
            ).length;
        });
        return 0 === topCenterTiles.length ? 0 : topCenterTiles[0].id + this.wangsetFirstgid;
    }

    mapPositionsFromWangset(wangset)
    {
        if(!wangset){
            return;
        }
        if(0 === wangset.wangtiles.length){
            return;
        }
        for(let wangtileData of wangset.wangtiles){
            let wangIdString = wangtileData.wangid.join(',');
            let wangPosition = sc.get(this.mappedPositionsByWangIds, wangIdString, '');
            if('middle-center' === wangPosition){
                this.mainTile = wangtileData.tileid + this.wangsetFirstgid;
            }
            if('' !== wangPosition){
                this.surroundingTilesPosition[wangPosition] = wangtileData.tileid + this.wangsetFirstgid;
                this.debugData['s-'+wangIdString+'-'+wangPosition] = wangtileData.tileid + this.wangsetFirstgid;
                continue;
            }
            let wangPositionCorner = sc.get(this.mappedPositionsByWangIdsCorners, wangIdString, '');
            if('' !== wangPositionCorner){
                this.cornersPosition[wangPositionCorner] = wangtileData.tileid + this.wangsetFirstgid;
                this.debugData['c-'+wangIdString+'-'+wangPositionCorner] = wangtileData.tileid + this.wangsetFirstgid;
            }
        }
    }

}

module.exports.WangsetMapper = WangsetMapper;
