/**
 *
 * Reldens - Tile Map Generator - InnerWalls
 *
 */

class InnerWalls
{

    sequences(tilesShortcuts)
    {
        let {sML, sMC, sMR, cTR, cTL, sTC} = tilesShortcuts;
        return {
            step1: [
                [[sMC, 0], [sML, 0]],
                [[0, sMC], [0, sMR]],
                [[sTC, 0], [cTL, 0]],
                [[0, sTC], [0, cTR]],
            ]
        }
    }

}

module.exports.InnerWalls = new InnerWalls();
