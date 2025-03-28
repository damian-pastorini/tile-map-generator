/**
 *
 * Reldens - TilesShortcuts
 *
 */

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
        this.tC = originalMappedData.topCenter || 0;
        this.originalMappedData = originalMappedData;
    }

}

module.exports.TilesShortcuts = TilesShortcuts;
