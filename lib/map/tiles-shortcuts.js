/**
 *
 * Reldens - TilesShortcuts
 *
 */

const { WangsetMapper } = require('./wangset-mapper');
const { sc } = require('@reldens/utils');

class TilesShortcuts
{

    constructor(pathTile, surroundingTilesPosition = {}, cornersPosition = {}, prefix = '', originalMappedData)
    {
        this.sTL = surroundingTilesPosition[prefix+'top-left'];
        this.sTC = surroundingTilesPosition[prefix+'top-center'];
        this.sTR = surroundingTilesPosition[prefix+'top-right'];
        this.sML = surroundingTilesPosition[prefix+'middle-left'];
        this.sMC = surroundingTilesPosition[prefix+'middle-center'];
        this.sMR = surroundingTilesPosition[prefix+'middle-right'];
        this.sBL = surroundingTilesPosition[prefix+'bottom-left'];
        this.sBC = surroundingTilesPosition[prefix+'bottom-center'];
        this.sBR = surroundingTilesPosition[prefix+'bottom-right'];
        this.cTL = cornersPosition[prefix+'top-left'];
        this.cTR = cornersPosition[prefix+'top-right'];
        this.cBL = cornersPosition[prefix+'bottom-left'];
        this.cBR = cornersPosition[prefix+'bottom-right'];
        this.p = 0 === pathTile && 0 !== this.sMC ? this.sMC : pathTile;
        this.tC = sc.get(originalMappedData, 'topCenter', 0);
        this.originalMappedData = originalMappedData;
        this.pathTileReplacement = null;
    }

    static fromPropertiesMappersList(
        tilesKey,
        mainTile,
        propertiesMapper,
        suffix,
        groundSpotsPropertiesMappers,
        optimizedMapFirstTileset
    ){
        if(suffix){
            tilesKey = tilesKey + suffix;
            propertiesMapper = groundSpotsPropertiesMappers[tilesKey];
        }
        let propertiesMapperShortCut = 'path' === tilesKey || !propertiesMapper ? '' : tilesKey+'-';
        let mappedData = {
            surroundingTilesPosition: propertiesMapper?.surroundingTilesPosition,
            cornersPosition: propertiesMapper?.cornersPosition
        }
        if(
            !propertiesMapper
            || 0 === Object.keys(propertiesMapper.surroundingTilesPosition).length
            || 0 === Object.keys(propertiesMapper.cornersPosition).length
        ){
            mappedData = TilesShortcuts.mapWangsetData(tilesKey, optimizedMapFirstTileset);
        }
        let instance = new TilesShortcuts(
            sc.get(mappedData, 'mainTile', mainTile),
            mappedData.surroundingTilesPosition,
            mappedData.cornersPosition,
            propertiesMapperShortCut,
            mappedData
        );
        if(0 === mainTile && mappedData.surroundingTilesPosition['middle-center'] && 'path' === tilesKey){
            instance.pathTileReplacement = mappedData.surroundingTilesPosition['middle-center'];
        }
        return instance;
    }

    static mapWangsetData(tilesKey, optimizedMapFirstTileset)
    {
        return new WangsetMapper(TilesShortcuts.fetchWangsetByName(tilesKey, optimizedMapFirstTileset));
    }

    static fetchWangsetByName(tilesKey, optimizedMapFirstTileset)
    {
        if(!optimizedMapFirstTileset?.wangsets){
            return false;
        }
        let filteredWangsets = optimizedMapFirstTileset.wangsets.filter(wangset => tilesKey === wangset.name);
        if(0 === filteredWangsets.length){
            return false;
        }
        filteredWangsets[0].firstgid = optimizedMapFirstTileset.firstgid;
        filteredWangsets[0].tilesProperties = optimizedMapFirstTileset.tiles;
        return filteredWangsets[0];
    }

}

module.exports.TilesShortcuts = TilesShortcuts;
