/**
 *
 * Reldens - Tile Map Generator - BordersAndCornersTiles
 *
 */

class BordersAndCornersTiles
{

    sequences(tilesShortcuts)
    {
        let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = tilesShortcuts;
        return {
            step1: [
                [[p, 0, p], [p, p, p]],
                [[0, p], [sML, p]],
                [[p, 0], [p, sMR]]
            ],
            step2: [
                [[p, 0, p], [p, p, p]],
                [[0, p], [sTC, p]],
                [[p, 0], [p, sBC]]
            ],
            step3: [
                [[0, sTC], [sTL, sTC]],
                [[sTC, 0], [sTC, sTR]],
                [[0, sBC], [sBL, sBC]],
                [[sBC, 0], [sBC, sBR]],
                [[sBC, sML], [sBC, cBL]],
                [[sTC, sML], [sTC, cTL]],
                [[sMR, sBC], [cBR, sBC]],
                [[sMR, sTC], [cTR, sTC]]
            ],
            step4: [
                [[sML, 0], [sML, sBL]],
                [[0, sML], [sTL, sML]],
                [[cBR, 0], [cBR, sBL]],
                [[sMR, 0], [sMR, sBR]],
                [[sMR, p], [cTR, p]],
                [[p, sMR], [p, cBR]],
                [[p, sML], [p, cBL]],
                [[sML, p], [cTL, p]],
                [[0, sMR], [sTR, sMR]],
                [[cBL, 0], [cBL, sBL]],
                [[0, cBL], [sTR, cBL]],
                [[0, cTL], [sTL, cTL]]
            ],
            step5: [
                [[sMR, sBL], [cBR, sBL]],
                [[sTL, sML], [sTL, cTL]],
                [[sMR, sBR], [cBR, sBR]],
                [[sBL, sML], [sBL, cBL]],
                [[sMR, sTR], [cTR, sTR]],
                [[cTR, 0], [cTR, sTR]],
                [[cTR, p], [p, p]],
                [[p, cBL], [p, p]],
                [[cTR, cBL], [p, p]],
                [[cBR, sBL], [cBR, sBR]]
            ],
            step6: [
                [[cBL, cBL], [cBL, sBL]],
                [[cTR, cTR], [cTR, sTR]],
                [[sBL, sBL], [sBL, cBL]],
                [[sBR, sBR], [sBR, cTR]],
                [[sTL, sTL], [sTL, cTL]],
                [[sTR, sTR], [sTR, cTR]],
                [[cBR, cBR], [cBR, sMR]],
                [[cBL, cBL], [cBL, sML]],
                [[sMR, cBR, sMR], [sMR, sMR, sMR]],
                [[sML, sBR, 0], [sML, sBL, 0]],
                [[sBC, cBR, cBL], [sBC, sBC, cBL]]
            ]
        }
    }

}

module.exports.BordersAndCornersTiles = new BordersAndCornersTiles();
