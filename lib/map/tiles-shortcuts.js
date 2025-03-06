/**
 *
 * Reldens - Tile Map Generator
 *
 */

class TilesShortcuts
{

    constructor(pathTile, surroundingTilesPosition = {}, cornersPosition = {}, prefix = '')
    {
        this.p = pathTile;
        this.sTL = surroundingTilesPosition[prefix+'top-left'];
        this.sTC = surroundingTilesPosition[prefix+'top-center'];
        this.sTR = surroundingTilesPosition[prefix+'top-right'];
        this.sML = surroundingTilesPosition[prefix+'middle-left'];
        // sMC = '121'; // since 'middle-center' is directly assigned
        this.sMR = surroundingTilesPosition[prefix+'middle-right'];
        this.sBL = surroundingTilesPosition[prefix+'bottom-left'];
        this.sBC = surroundingTilesPosition[prefix+'bottom-center'];
        this.sBR = surroundingTilesPosition[prefix+'bottom-right'];
        this.cTL = cornersPosition[prefix+'top-left'];
        this.cTR = cornersPosition[prefix+'top-right'];
        this.cBL = cornersPosition[prefix+'bottom-left'];
        this.cBR = cornersPosition[prefix+'bottom-right'];
    }

}

module.exports.TilesShortcuts = TilesShortcuts;
