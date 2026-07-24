/**
 *
 * Reldens - Tile Map Generator - OuterWalls
 *
 */

class OuterWalls
{

    sequences(spotTiles, outerTiles)
    {
        let {p, tC, sTL, sTC, sTR, sMC, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = spotTiles;
        return {
            step1: [
                [[sML, cTL], [sTC, cTL]],
                [[cTR, sMR], [cTR, sTR]],
                [[sML, sTC], [sTL, sTC]],
                [[sTC, sMR], [sTC, sTR]],
                [[sTC, cBR], [sTC, sTR]],
                [[sBC, 0], [sTL, 0]],
                [[0, sBC], [0, sBL]],
            ],
            step2: [
                [[sML, cBL, sML], [sML, sML, sML]],
                [[sMR, cBR, sMR], [sMR, sMR, sMR]],
                [[sMR, sBC], [sMR, sBR]],
                [[sBC, cBR], [sBC, sBC]],
                [[sTC, sBL], [sTL, sBL]],
                [[0, cBR, cBL, 0], [0, cBR, sBR, 0]],
                [[0, sTR, sBC, 0], [0, sTR, sBR, 0]],
                [[sMR, cBR, 0], [sMR, sBR, 0]],
                [[sML, cBR, 0], [sML, sBL, 0]],
                [[cBR, sTR, cBL, 0], [cBR, sTR, sTL, 0]],
                [[sML, 0, sBL], [sML, sML, sBL]],
                [[0, sTL, cTL, sML], [0, sTL, sML, sML]],
                [[0, sTL, cTR, sML], [0, sTL, sML, sML]],
                [[0, sTR, cTL, sMR], [0, sTR, sMR, sMR]],
                [[0, sTR, cTR, sMR], [0, sTR, sMR, sMR]],
                [[0, cTR, cTL, 0], [0, cTR, sBR, 0]]
            ],
            step3: [
                [[0, sTC, cTL], [0, sTL, cTL]],
                [[0, sBC, cBL], [0, sBL, cBL]],
                [[0, cTR, cBR], [0, cTR, sBR]],
                [[sBC, sTL, sMR], [sBC, sBR, sMR]],
                [[sTC, cTL, sTC], [sTC, sTC, sTC]],
                [[sBC, cBL, sBC], [sBC, sBC, sBC]],
                [[outerTiles.sMC, outerTiles.sMR, outerTiles.sMC], [outerTiles.sMC, outerTiles.sMC, outerTiles.sMC]],
                [[outerTiles.sTC, outerTiles.cTL, outerTiles.sTC], [outerTiles.sTC, outerTiles.sTC, outerTiles.sTC]],
                [[sTC, cTR], [sTC, sTC]],
                [[outerTiles.sMC, outerTiles.sML], [outerTiles.sMC, outerTiles.sMC]],
                [[outerTiles.sTC, outerTiles.cTR], [outerTiles.sTC, outerTiles.sTC]],
                [[sTC, cBR], [sTC, sTR]],
                [[sTL, cBL, sBL], [sTL, sML, sBL]],
                [[cBL, cTL], [sTL, cTL]],
                [[0, sTC, 0], [0, 0, 0]],
                [[sTC, cBR, sTC], [sTC, sTC, sTC]],
                [[sTL, cBR, sBR], [sTL, sBL, sBR]],
                [[sBC, cBR, sBC], [sBC, sBC, sBC]],
                [[sBC, cBL, sBC], [sBC, sBC, sBC]],
                [[sBC, cBR, sTL], [sBC, sBR, sTL]],
                [[0, sBL, sTR, 0], [0, sBL, sBR, 0]],
                [[sBC, 0, sBC], [sBC, sBC, sBC]],
                [[sTR, cBR, sTL], [sTR, sMR, sBR]],
                [[0, sBR, sBC], [0, sBL, sBC]],
                [[0, cBR, sBL, 0], [0, cBR, sBR, 0]],
                [[0, cBL, sTC], [0, sTL, sTC]],
                [[0, cTR, sBR], [0, cTR, sTR]],
                [[sBC, sTL, 0], [sBC, sBR, 0]],
                [[outerTiles.sMC, cBR, 0], [outerTiles.sMC, sMR, 0]],
                [[outerTiles.sML, cBR, 0], [outerTiles.sML, sMR, 0]],
                [[outerTiles.sMR, cBL, 0], [outerTiles.sMR, sML, 0]],
                [[sBL, sTL], [sBL, sBR]],
                [[0, cBR, outerTiles.sMR], [0, sMR, outerTiles.sMR]],
                [[0, cBL, outerTiles.sML], [0, sML, outerTiles.sML]]
            ],
            step4: [
                [[sML, 0, sBR], [sML, sML, sBL]],
                [[sMR, 0, sBL], [sMR, sMR, sBR]],
                [[0, cBR, cBL], [0, cBR, sBR]],
                [[sMR, cBR, sBR], [sMR, sMR, sBR]],
                [[0, cBL, cBR], [0, cBL, sBL]],
                [[sML, cTL, sBL], [sML, sML, sBL]],
                [[sML, cTL, sBL], [sML, sML, sBL]],
                [[sTL, cBL, sBL], [sTL, sML, sBL]],
                [[sTL, cBL, sML], [sTL, sML, sML]],
                [[sTL, cBL, 0], [sTL, sBL, 0]],
                [[0, sMR, sMR, sTC, outerTiles.sMC], [0, 0, 0, sTC, outerTiles.sMC]],
                [[sML, cBL, sBL], [sML, sML, sBL]],
                [[sML, cBL, sML], [sML, sML, sML]],
                [[cBR, cBL, 0], [cBR, sBR, 0]],
                [[sMR, cBL, sMR], [sMR, sBR, sMR]],
                [[0, cBL, 0], [0, 0, 0]]
            ],
            step5: [
                [[sBC, cBR, sBR], [sBC, sBC, sBR]],
                [[0, cBR, sTL, 0], [0, cBR, sBR, 0]],
                [[sTL, cBL, sML], [sTL, sML, sML]],
                [[sBC, 0, sBR], [sBC, sBC, sBR]],
                [[sBL, 0, sBC], [sBL, sBC, sBC]],
                [[cTR, cBR, 0], [cTR, sTR, 0]],
                [[sBL, sBR, cTL, outerTiles.sMR], [0, sTL, cTL, outerTiles.sMR]],
                [[0, sBL, sBR, cTL, 0], [0, 0, sTL, cTL, 0]],
                [[0, sBL, cBL, sTC], [0, 0, sTL, sTC]],
                [[sTL, 0, sTR], [sTL, sTC, sTR]],
                [[sMR, sTR, cBR], [sMR, sTL, cBR]],
                [[sTR, 0, sTL], [sTR, sTC, sTL]],
                [[sTL, 0, sTR], [sTL, sTC, sTR]],
                [[sBR, 0, sBL], [sBR, sBC, sBL]],
                [[sBL, 0, sBR], [sBL, sBC, sBR]]
            ],
        }
    }

}

module.exports.OuterWalls = new OuterWalls();
