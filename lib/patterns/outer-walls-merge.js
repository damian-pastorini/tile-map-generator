/**
 *
 * Reldens - Tile Map Generator - OuterWalls
 *
 */

class OuterWallsMerge
{

    sequences(spotTiles, outerTiles = {}, outerTc = 0)
    {
        let {p, tC, sTL, sTC, sTR, sMC, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = spotTiles;
        return {
            step1: [
                [[sBC, 0, cBL], [sBC, sBC, cBL]],
                [[cBR, 0, sBC], [cBR, sBC, sBC]],
                [[sMR, 0, sBC], [sMR, sBL, sBC]],
                [[sMR, sBR, sBC], [sMR, sBL, sBC]],
                [[sMR, sTR, cTL], [sMR, sMR, cTL]],
                [[0, sMR, 0, 0], [0, sMR, sML, 0]],
                [[0, 0, sML, 0], [0, sMR, sML, 0]],
                [[cBR, cBR, cBL, 0], [cBR, cBL, 0, 0]],
                [[cBR, sBC, cBR, cBL, 0], [cBR, cBL, 0, 0, 0]],
                [[cTR, 0, sML], [cTR, sTR, sML]],
                [[sTC, sTR, cTL], [sTC, sTC, cTL]],
                [[cBR, cBL, cBL], [0, cBR, cBL]],
                [[sMR, sBL, cBR, sBC], [sMR, sBL, sBC, sBC]],
                [[cBR, sTC, cTL], [0, cTR, cTL]],
                [[sMR, 0, cTL], [sMR, sTL, cTL]],
                [[cTR, sTR, cTL], [cTR, sTC, cTL]],
                [[sTC, cBL, sML], [sTC, sBR, sML]],
                [[sBC, cBL, sML], [sBC, sBR, sML]],
                [[sMR, sBL, cBL, sML], [sMR, sBL, sBR, sML]],
            ],
            step2: [
                [[sMR, cTR, cBR, sMR], [sMR, sMR, sMR, sMR]],
                [[sML, cTL, cBL, sML], [sML, sML, sML, sML]],
                [[cBR, 0, cTR], [cBR, sMR, cTR]],
                [
                    [sBC, cTR, outerTiles.sML, outerTiles.cBL, outerTiles.cBR],
                    [sBC, sTL, cTL, outerTiles.sMR, outerTiles.cBR]
                ],
                [[sML, cTL, cBL], [sML, sML, sML]],
                [[sML, 0, cTL], [sML, sML, cTL]],
                [[cBL, 0, cTL], [cBL, sML, cTL]],
                [[sMR, sBR, cTR], [sMR, sMR, cTR]],
                [[sML, cBL, sBC], [sML, sML, sBL]],
                [[sML, sBL, cTL], [sML, sML, cTL]],
                [[sML, sBC, sTC], [sML, sBL, sTC]],
                [[sML, sBC, sTR], [sML, sBL, sTC]],
                [[cBR, cTR, sMR], [cBR, sMR, sMR]]
            ],
            step3: [
                [[sBC, cTL, sTC], [sBC, outerTc, sTC]],
                [[sBC, sBC, sTC], [sBC, outerTc, sTC]]
            ],
            step4: [
                [[cTR, cTL, cBL, cTL], [cTR, sBC, sBC, cTL]],
                [
                    [outerTiles.sMR, outerTiles.sMC, outerTiles.sML, outerTiles.sMC],
                    [outerTiles.sMR, outerTiles.sMC, outerTiles.sMC, outerTiles.sMC]
                ],
                [
                    [outerTiles.cBR, outerTiles.sBC, outerTiles.cBL, outerTiles.sBC],
                    [outerTiles.cBR, outerTiles.sBC, outerTiles.sBC, outerTiles.sBC]
                ],
                [[cBR, 0, cBL], [cBR, sBC, cBL]],
                [[sMR, sBL, outerTiles.sMC], [sMR, sML, outerTiles.sMC]],
                [[cTR, sTL, cTL], [cTR, sTC, cTL]],
                [[sTR, sBR, cBL], [sTR, sBL, cBL]],
                [[sMR, cBR, sBR], [sMR, sBL, sBR]],
                [[sMR, sBR, cBL], [sMR, sBL, cBL]],
                [[sTC, cTR, cTL], [sTC, sTC, cTL]],
                [[outerTiles.sMC, outerTiles.sMR, outerTiles.sML], [outerTiles.sMC, outerTiles.sMC, outerTiles.sML]],
                [[outerTiles.sBC, outerTiles.cBR, outerTiles.cBL], [outerTiles.sBC, outerTiles.sBC, outerTiles.cBL]],
                [[sMR, cBR, sBC], [sMR, sBL, sBC]],
                [[sBC, cBL, sBC], [sBC, sBC, sBC]]
            ],
            step5: [
                [[sMR, 0, sML], [sMR, outerTc, sML]],
                [[sBR, 0, sML], [sBR, outerTc, sML]],
                [[sTR, 0, sML], [sTR, outerTc, sML]],
                [[sTR, 0, sBR], [sTR, outerTc, sBR]],
                [[sBR, 0, sBL], [sBR, outerTc, sBL]],
                [[sMR, 0, sBR], [sMR, outerTc, sBR]],
                [[sMR, 0, sTR], [sMR, outerTc, sTR]],
                [[sMR, 0, sBL], [sMR, outerTc, sBL]],
                [[sTR, 0, sTL], [sTR, outerTc, sTL]],
                [[sMR, sMR, sML], [sMR, outerTc, sML]],
                [[sTR, sMR, sBR], [sTR, outerTc, sBR]],
                [[cBR, sBC, 0, sMR], [cBR, outerTc, outerTc, sMR]],
                [[sMR, 0, 0, sTL], [sMR, outerTc, outerTc, sTL]],
                [[sTR, sMR, sTL], [sTR, outerTc, sTL]],
                [[sMR, 0, sTL], [sMR, outerTc, sTL]],
                [[sTC, 0, sTL], [sTR, outerTc, sTL]],
                [[sBR, sMR, sML], [sBR, outerTc, sML]],
                [[sMR, sBC, 0, sTL], [sMR, outerTc, outerTc, sTL]],
                [[sMR, sMR, sBL], [sMR, outerTc, sBL]],
                [[sBR, sMR, sBL], [sBR, outerTc, sBL]],
                [[sMR, sBC, sBC, sML], [sMR, outerTc, outerTc, sML]],
                [[sBR, sBC, sBC, 0, sML], [sBR, outerTc, outerTc, outerTc, sML]],
                [[sTR, sMR, sML], [sTR, outerTc, sML]],
                [[sTR, sBC, 0, sML], [sTR, outerTc, outerTc, sML]],
                [[cTR, 0, sTL], [sMR, outerTc, sTL]],
                [[0, sMR, cTL, cBL, sML, 0], [0, sMR, outerTc, outerTc, sML, 0]],
                [[sMR, sMR, cBL], [sMR, outerTc, cBL]],
                [[sMR, sBC, sBC, 0, sML], [sMR, outerTc, outerTc, outerTc, sML]],
                [[sMR, sBL, sBC, sML], [sMR, outerTc, outerTc, sML]],
                [[sBR, sBC, 0, sBL], [sBR, outerTc, outerTc, sBL]],
                [[sTR, 0, sMR, sML], [sTR, outerTc, outerTc, sML]],
                [[sMR, sMR, sTL], [sMR, outerTc, sTL]],
                [[sTR, 0, sBL], [sTR, outerTc, sBL]],
                [[sMR, cBR, sTL], [sMR, outerTc, sTL]],
                [[sMR, outerTc, sBR, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, cBL, 0], [sMR, outerTc, cTL]],
                [[sMR, sML, cBR, sBC, 0, sML], [sMR, outerTc, outerTc, outerTc, outerTc, sML]],
                [[sMR, sBL, sBC, sBC, sML], [sMR, outerTc, outerTc, outerTc, sML]],
                [[sMR, sML, 0, sTL], [sMR, outerTc, outerTc, sTL]],
                [[sMR, sBC, 0, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, outerTc, sBL, sML], [sMR, outerTc, outerTc, sML]],
                [[cBR, sBR, sBC, 0, sML], [cBR, sBR, outerTc, outerTc, sML]],
                [[sMR, sBL, 0, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, sML, sMR, sBL], [sMR, outerTc, outerTc, sBL]],
                [[sTR, sBL, sBR, sTL], [sTR, outerTc, outerTc, sTL]],
                [[sMR, sML, sMR, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, sBL, cBL, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, sBL, cBL, sBL], [sMR, outerTc, outerTc, sBL]],
                [[sBR, sBC, cBL, sML], [sBR, outerTc, outerTc, sML]],
                [[cBR, sBR, sBR, sTL], [cBR, outerTc, outerTc, sTL]],
                [[sMR, sTL, sML], [sMR, outerTc, sML]],
                [[sMR, sBL, sML], [sMR, outerTc, sML]],
                [[sMR, cTL, cTL], [sMR, outerTc, cTL]],
                [[cBR, sML, sMR, sML], [cBR, outerTc, outerTc, sML]],
                [[sMR, cTR, sML], [sMR, outerTc, sML]],
                [[cBR, cTR, sML], [cBR, outerTc, sML]],
                [[sMR, cBR, cTL], [sMR, outerTc, cTL]],
                [[sMR, sBC, cTR, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, sBR, sML], [sMR, outerTc, sML]],
                [[sTR, sBR, sML], [sTR, outerTc, sML]],
                [[cBR, sBR, sBR, sML], [cBR, outerTc, outerTc, sML]],
                [[sMR, sBL, sBL, sBC], [sMR, outerTc, sBL, sBC]],
                [[0, sMR, sTR, sML, 0], [0, sMR, outerTc, sML, 0]],
                [[sMR, sBL, sBL, cBL], [sMR, outerTc, sBL, cBL]],
                [[sMR, sBL, sBC, sTL, cTL], [sMR, outerTc, outerTc, sTL, cTL]],
                [[sMR, sBL, outerTc, outerTc, sBC, sML], [sMR, outerTc, outerTc, outerTc, outerTc, sML]],
                [[sTR, sBR, sTL], [sTR, outerTc, sTL]],
                [[sMR, sBC, sBR, sML], [sMR, outerTc, outerTc, sML]],
                [[sMR, sBR, sBC, sBR, sML], [sMR, outerTc, outerTc, outerTc, sML]],
                [[sMR, sBR, sTL, sTC], [sMR, outerTc, sTL, sTC]],
                [[sMR, sBR, sTL, cTL], [sMR, outerTc, sTL, cTL]],
            ],
            step6: [
                [[sBC, 0], [sBC, cBL]],
                [[sBC, cBL, cBR], [sBC, sBC, cBL]],
                [[cTR, cTL, cTL], [cTR, sTC, cTL]],
                [[sBC, cBL, sBC], [sBC, sBC, sBC]],
                [[sBC, cBL, sBR, sML], [sBC, sBC, sBR, sML]],
                [[sTR, cBR, sBC], [sTR, sBL, sBC]],
                [[outerTiles.sML, outerTiles.sMR, outerTiles.sMR], [outerTiles.sML, outerTiles.sMC, outerTiles.sMR]],
                [[outerTiles.cBL, outerTiles.cBR, outerTiles.cBR], [outerTiles.cBL, outerTiles.sBC, outerTiles.cBR]],
                [[outerTiles.sMC, outerTiles.sML, outerTiles.sMR], [outerTiles.sMC, outerTiles.sMC, outerTiles.sMR]],
                [[outerTiles.sBC, outerTiles.cBL, outerTiles.cBR], [outerTiles.sBC, outerTiles.sBC, outerTiles.cBR]],
                [[cBR, sBR, cBL], [cBR, sBC, cBL]],
                [[cBR, 0, sBL, cBL], [cBR, sBC, sBC, cBL]],
                [[sMR, 0, cBL], [sMR, sBL, cBL]],
                [[cBR, sBL, cBL], [cBR, sBC, cBL]],
                [[sBC, cBR, cBL], [sBC, sBC, cBL]],
                [[cBR, cBL, sBC], [cBR, sBC, sBC]],
                [[cBL, sBL, cTL], [cBL, sML, cTL]],
                [[cBR, 0, sBR], [cBR, sBC, sBR]],
                [[sML, sTR, cTL], [sTR, sTC, cTL]],
                [[cTR, cTR, cTL], [cTR, sTC, cTL]],
                [[0, 0, sBC], [cBR, sBC, sBC]]
            ],
            step7: [
                [[cBR, sBR, cTR], [cBR, sMR, cTR]],
                [[0, cTL, 0], [0, 0, 0]],
                [[sMR, 0, cTR], [sMR, sMR, cTR]],
                [[0, cBR, sML], [0, cBL, sML]],
                [[cBL, sTL, cTL], [cBL, sML, cTL]],
                [[cBL, sBL, cTL], [cBL, sML, cTL]],
                [[cBR, cBR, cTR], [cBR, sMR, cTR]]
            ],
            step8: [
                [[0, cBL, 0], [cBR, cBL, 0]],
                [[sBL, cBR, cBL], [sBL, sBC, cBL]],
                [[sBL, cBL, sML], [sBL, sBR, sML]],
                [[sBC, sBR, sTL, 0], [sBC, sBC, sBC, cBL]],
                [[sMR, sML, cTL], [sMR, sTL, cTL]],
                [[sTC, sTC, 0], [sTC, sTC, cTL]],
                [[cBR, sBL, sBC], [cBR, sBC, sBC]],
                [[0, sTC], [cTR, sTC]],
                [[0, outerTc], [outerTiles.sML, outerTc]],
                [[outerTc, 0], [outerTc, outerTiles.sMR]]
            ]
        }
    }

}

module.exports.OuterWallsMerge = new OuterWallsMerge();
