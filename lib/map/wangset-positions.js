/**
 *
 * Reldens - WangsetPositions
 *
 * Tiled terrain sets store one "wangid" per tile: an array with 8 slots for the tile edges and corners, where
 * each slot points to a terrain color. These are the values the tiled map editor app generates for each tile
 * position, they are used to read the tiles positions from a terrain set and to write the positions back into a
 * new one.
 *
 */

class WangsetPositions
{

    /**
     * @returns {Object<string, Array<number>>}
     */
    static surroundingWangIds()
    {
        return {
            'top-left': [0, 0, 0, 1, 0, 0, 0, 0],
            'top-center': [0, 0, 0, 1, 0, 1, 0, 0],
            'top-right': [0, 0, 0, 0, 0, 1, 0, 0],
            'middle-left': [0, 1, 0, 1, 0, 0, 0, 0],
            'middle-center': [0, 1, 0, 1, 0, 1, 0, 1],
            'middle-right': [0, 0, 0, 0, 0, 1, 0, 1],
            'bottom-left': [0, 1, 0, 0, 0, 0, 0, 0],
            'bottom-center': [0, 1, 0, 0, 0, 0, 0, 1],
            'bottom-right': [0, 0, 0, 0, 0, 0, 0, 1]
        };
    }

    /**
     * @returns {Object<string, Array<number>>}
     */
    static cornersWangIds()
    {
        return {
            'top-left': [0, 1, 0, 1, 0, 1, 0, 0],
            'top-right': [0, 0, 0, 1, 0, 1, 0, 1],
            'bottom-left': [0, 1, 0, 1, 0, 0, 0, 1],
            'bottom-right': [0, 1, 0, 0, 0, 1, 0, 1]
        };
    }

    /**
     * @param {Object<string, Array<number>>} wangIdsByPositions
     * @returns {Object<string, string>}
     */
    static joinWangIds(wangIdsByPositions)
    {
        let joinedWangIds = {};
        for(let positionKey of Object.keys(wangIdsByPositions)){
            joinedWangIds[positionKey] = wangIdsByPositions[positionKey].join(',');
        }
        return joinedWangIds;
    }

}

module.exports.WangsetPositions = WangsetPositions;
