/**
 *
 * Reldens - Tile Map Generator - Corners
 *
 */

class Corners
{

    sequences(spotTiles, outerTiles = {})
    {
        return {
            step1: [
                [[0, spotTiles.sBL, 0], [0, 0, 0]],
                [[0, spotTiles.sBR, 0], [0, 0, 0]],
                [[0, spotTiles.sTL, 0], [0, 0, 0]],
                [[0, spotTiles.sTR, 0], [0, 0, 0]],
                [[0, spotTiles.cBL, 0], [0, 0, 0]],
                [[0, spotTiles.cBR, 0], [0, 0, 0]],
                [[0, spotTiles.cTL, 0], [0, 0, 0]],
                [[0, spotTiles.cTR, 0], [0, 0, 0]]
            ],
            step2: [
                [[0, outerTiles.cBL, 0], [0, 0, 0]],
                [[0, outerTiles.cBR, 0], [0, 0, 0]]
            ]
        }
    }

}

module.exports.Corners = new Corners();
