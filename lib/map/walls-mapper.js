/**
 *
 * Reldens - WallsMapper
 *
 */

class WallsMapper
{

    constructor(spotTiles, wallTiles)
    {
        this.spotTiles = spotTiles;
        this.wallTiles = wallTiles;
    }

    mappedPositions()
    {
        return {
            [this.spotTiles.sML]: [{x: -1, y: 0}],
            [this.spotTiles.sMR]: [{x: 1, y: 0}],
            [this.spotTiles.sTC]: [{x: 0, y: -1}],
            [this.spotTiles.sBC]: [{x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}],
            [this.spotTiles.sTL]: [{x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}],
            [this.spotTiles.sTR]: [{x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}],
            [this.spotTiles.sBL]: [
                {x: -1, y: 0},
                {x: 0, y: 1},
                {x: 0, y: 2},
                {x: 0, y: 3},
                {x: -1, y: 1},
                {x: -1, y: 2},
                {x: -1, y: 3}
            ],
            [this.spotTiles.sBR]: [
                {x: 1, y: 0},
                {x: 0, y: 1},
                {x: 0, y: 2},
                {x: 0, y: 3},
                {x: 1, y: 1},
                {x: 1, y: 2},
                {x: 1, y: 3}
            ],
            [this.spotTiles.cTL]: [{x: -1, y: -1}],
            [this.spotTiles.cTR]: [{x: 1, y: -1}],
            [this.spotTiles.cBL]: [{x: -1, y: 1}],
            [this.spotTiles.cBR]: [{x: 1, y: 1}],
        }
    }

    oppositeTiles()
    {
        return {
            // (x - 1, y)
            [this.spotTiles.sML]: [this.spotTiles.sMR],
            // (x + 1, y)
            [this.spotTiles.sMR]: [this.spotTiles.sML],
            // (x, y - 1)
            [this.spotTiles.sTC]: [this.spotTiles.sBC],
            // (x, y + 1), (x, y + 2), (x, y + 3)
            [this.spotTiles.sBC]: [this.spotTiles.sTC, this.wallTiles.p, this.wallTiles.sTC],
            // (x - 1, y), (x - 1, y - 1), (x, y - 1)
            [this.spotTiles.sTL]: [this.spotTiles.sMR, this.spotTiles.cBR, this.spotTiles.sBC],
            // (x, y - 1), (x + 1, y - 1), (x + 1, y)
            [this.spotTiles.sTR]: [this.spotTiles.sBC, this.spotTiles.cBL, this.spotTiles.sML],
            // [this.spotTiles.sML] + [this.spotTiles.sBC] + (x - 1, y + 1), (x - 1, y + 2), (x + -1, y + 3)
            [this.spotTiles.sBL]: [
                this.spotTiles.sMR,
                this.spotTiles.sTC,
                this.wallTiles.p,
                this.wallTiles.sTC,
                this.spotTiles.cTR,
                this.wallTiles.sML,
                this.wallTiles.cTR
            ],
            // [this.spotTiles.sMR] + [this.spotTiles.sBC] + (x + 1, y + 1), (x + 1, y + 2), (x + 1, y + 3)
            [this.spotTiles.sBR]: [
                this.spotTiles.sML,
                this.spotTiles.sTC,
                this.wallTiles.p,
                this.wallTiles.sTC,
                this.spotTiles.cTL,
                this.wallTiles.sMR,
                this.wallTiles.cTL
            ],
            // (x - 1, y - 1)
            [this.spotTiles.cTL]: [this.spotTiles.sBR],
            // (x + 1, y -1)
            [this.spotTiles.cTR]: [this.spotTiles.sBL],
            // (x - 1, y + 1)
            [this.spotTiles.cBL]: [this.spotTiles.sTR],
            // (x + 1, y + 1)
            [this.spotTiles.cBR]: [this.spotTiles.sTL]
        };
    }

}

module.exports.WallsMapper = WallsMapper;
