/**
 *
 * Reldens - WangsetMapper
 *
 */

const { sc } = require('@reldens/utils');

class WangsetMapper
{

    constructor(wangset)
    {
        this.wangsetName = wangset.name;
        this.wangsetFirstgid = wangset.firstgid;
        this.surroundingTilesPosition = {};
        this.cornersPosition = {};
        this.mainTile = 0;
        // these values are determined on the tiled map editor app and should be always the same format:
        let cTL = [0, 1, 0, 1, 0, 1, 0, 0].join(',');
        let cTR = [0, 0, 0, 1, 0, 1, 0, 1].join(',');
        let cBL = [0, 1, 0, 1, 0, 0, 0, 1].join(',');
        let cBR = [0, 1, 0, 0, 0, 1, 0, 1].join(',');
        let sTL = [0, 0, 0, 1, 0, 0, 0, 0].join(',');
        let sTC = [0, 0, 0, 1, 0, 1, 0, 0].join(',');
        let sTR = [0, 0, 0, 0, 0, 1, 0, 0].join(',');
        let sML = [0, 1, 0, 1, 0, 0, 0, 0].join(',');
        let sMC = [0, 1, 0, 1, 0, 1, 0, 1].join(',');
        let sMR = [0, 0, 0, 0, 0, 1, 0, 1].join(',');
        let sBL = [0, 1, 0, 0, 0, 0, 0, 0].join(',');
        let sBC = [0, 1, 0, 0, 0, 0, 0, 1].join(',');
        let sBR = [0, 0, 0, 0, 0, 0, 0, 1].join(',');
        this.mappedWangIdsByKeys = {
            'top-left': sTL,
            'top-center': sTC,
            'top-right': sTR,
            'middle-left': sML,
            'middle-center': sMC,
            'middle-right': sMR,
            'bottom-left': sBL,
            'bottom-center': sBC,
            'bottom-right': sBR
        };
        this.mappedPositionsByWangIds = {};
        for(let key of Object.keys(this.mappedWangIdsByKeys)){
            this.mappedPositionsByWangIds[this.mappedWangIdsByKeys[key]] = key;
        }
        this.mappedWangIdsByKeysCorners = {
            'top-left': cTL,
            'top-right': cTR,
            'bottom-left': cBL,
            'bottom-right': cBR
        };
        this.mappedPositionsByWangIdsCorners = {};
        for(let key of Object.keys(this.mappedWangIdsByKeysCorners)){
            this.mappedPositionsByWangIdsCorners[this.mappedWangIdsByKeysCorners[key]] = key;
        }
        this.mapPositionsFromWangset(wangset);
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
                continue;
            }
            let wangPositionCorner = sc.get(this.mappedPositionsByWangIdsCorners, wangIdString, '');
            if('' !== wangPositionCorner){
                this.cornersPosition[wangPositionCorner] = wangtileData.tileid + this.wangsetFirstgid;
            }
        }
    }

}

module.exports.WangsetMapper = WangsetMapper;
