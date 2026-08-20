/**
 *
 * Reldens - SpotTerrainsBuilder
 *
 * Builds the tileset terrain sets (the tiled map editor app "wangsets") for the ground spots included in the
 * generated map, so every spot can be painted as a terrain when the map is edited. The terrains are created from
 * the tiles positions already resolved for each spot and only the tiles available in the map tileset are used.
 *
 */

const { WangsetPositions } = require('./wangset-positions');
const { sc } = require('@reldens/utils');

class SpotTerrainsBuilder
{

    /**
     * @param {Object} spotsTerrains
     * @param {number} tileCount
     * @param {number} firstGid
     * @returns {Array<Object>}
     */
    static build(spotsTerrains, tileCount, firstGid)
    {
        if(!spotsTerrains){
            return [];
        }
        let wangsets = [];
        for(let terrainName of Object.keys(spotsTerrains)){
            let wangset = SpotTerrainsBuilder.buildWangset(terrainName, spotsTerrains[terrainName], {tileCount, firstGid});
            if(wangset){
                wangsets.push(wangset);
            }
        }
        return wangsets;
    }

    /**
     * @param {string} terrainName
     * @param {Object} mappedPositions
     * @param {Object} tilesetData
     * @returns {Object|boolean}
     */
    static buildWangset(terrainName, mappedPositions, tilesetData)
    {
        let wangtiles = SpotTerrainsBuilder.buildWangtiles(mappedPositions, tilesetData);
        if(0 === wangtiles.length){
            return false;
        }
        let wangset = {name: terrainName, type: 'mixed', wangtiles};
        wangset.tile = SpotTerrainsBuilder.fetchTileId(
            sc.get(mappedPositions, 'surroundingTilesPosition', {})['middle-center'],
            tilesetData
        );
        wangset.colors = [{
            name: terrainName,
            color: '#ff0000',
            probability: 1,
            tile: wangset.tile
        }];
        return wangset;
    }

    /**
     * @param {Object} mappedPositions
     * @param {Object} tilesetData
     * @returns {Array<Object>}
     */
    static buildWangtiles(mappedPositions, tilesetData)
    {
        let wangtilesData = {wangtiles: [], usedTileIds: []};
        SpotTerrainsBuilder.appendWangtiles(
            wangtilesData,
            sc.get(mappedPositions, 'surroundingTilesPosition', {}),
            WangsetPositions.surroundingWangIds(),
            tilesetData
        );
        SpotTerrainsBuilder.appendWangtiles(
            wangtilesData,
            sc.get(mappedPositions, 'cornersPosition', {}),
            WangsetPositions.cornersWangIds(),
            tilesetData
        );
        return wangtilesData.wangtiles;
    }

    /**
     * @param {Object} wangtilesData
     * @param {Object} positionsGids
     * @param {Object} wangIdsByPositions
     * @param {Object} tilesetData
     */
    static appendWangtiles(wangtilesData, positionsGids, wangIdsByPositions, tilesetData)
    {
        for(let positionKey of Object.keys(positionsGids)){
            let wangId = wangIdsByPositions[positionKey];
            let tileId = SpotTerrainsBuilder.fetchTileId(positionsGids[positionKey], tilesetData);
            if(!wangId || -1 === tileId || -1 !== wangtilesData.usedTileIds.indexOf(tileId)){
                continue;
            }
            wangtilesData.usedTileIds.push(tileId);
            wangtilesData.wangtiles.push({tileid: tileId, wangid: wangId});
        }
    }

    /**
     * @param {number|string} tileGid
     * @param {Object} tilesetData
     * @returns {number}
     */
    static fetchTileId(tileGid, tilesetData)
    {
        let tileId = Number(tileGid) - Number(tilesetData.firstGid);
        if(isNaN(tileId) || 0 > tileId || tileId >= Number(tilesetData.tileCount)){
            return -1;
        }
        return tileId;
    }

}

module.exports.SpotTerrainsBuilder = SpotTerrainsBuilder;
