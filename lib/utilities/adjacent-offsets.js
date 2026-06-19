/**
 *
 * Reldens - Tile Map Generator - AdjacentOffsets
 *
 */

class AdjacentOffsets
{

    placementOffsets()
    {
        return [
            {x: 1, y: 0},
            {x: 1, y: 1},
            {x: 0, y: 1},
            {x: -1, y: 1},
            {x: -1, y: 0},
            {x: -1, y: -1},
            {x: 0, y: -1},
            {x: 1, y: -1}
        ];
    }

}

module.exports.AdjacentOffsets = AdjacentOffsets;
