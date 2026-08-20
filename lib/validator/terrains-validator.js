/**
 *
 * Reldens - Tile Map Generator - TerrainsValidator
 *
 * Validates the terrain sets (the tiled map editor app "wangsets") included in the generated map tileset. The
 * terrains tiles must be the same tiles resolved for each spot position when the spot was generated, they must
 * match the source tileset terrains from where the tiles were taken, and they must be present in the generated
 * map, otherwise the terrains would be useless to paint the map when it is edited.
 *
 */

const { MapValidator } = require('./map-validator');
const { WangsetMapper } = require('../map/wangset-mapper');
const { WangsetPositions } = require('../map/wangset-positions');
const { sc } = require('@reldens/utils');

class TerrainsValidator extends MapValidator
{

    fetchMapTileset(map)
    {
        let tilesets = sc.get(map, 'tilesets', []);
        if(0 === tilesets.length){
            return false;
        }
        return tilesets[0];
    }

    isAvailableTile(tileGid, tileset)
    {
        let firstGid = Number(sc.get(tileset, 'firstgid', 1));
        if(isNaN(Number(tileGid)) || Number(tileGid) < firstGid){
            return false;
        }
        return Number(tileGid) - firstGid < Number(sc.get(tileset, 'tilecount', 0));
    }

    mapTerrainPositions(terrainName, wangtiles, firstGid)
    {
        return new WangsetMapper({
            name: terrainName,
            firstgid: Number(firstGid),
            wangtiles: sc.isArray(wangtiles) ? wangtiles : []
        });
    }

    compareTerrainWithExpected(terrain, resolvedPositions, tileset, validation)
    {
        this.comparePositions(
            terrain.name,
            this.buildExpectedTerrainTiles(resolvedPositions, tileset),
            this.mapTerrainPositions(terrain.name, terrain.wangtiles, tileset.firstgid),
            validation
        );
        return validation;
    }

    appendExpectedPositions(expectedTiles, positionsKey, resolvedGids, wangIdsByPositions, tileset)
    {
        for(let positionKey of Object.keys(resolvedGids)){
            let tileGid = Number(resolvedGids[positionKey]);
            let isMappedPosition = Boolean(wangIdsByPositions[positionKey]);
            let isFreeTile = -1 === expectedTiles.usedTiles.indexOf(tileGid);
            if(isMappedPosition && isFreeTile && this.isAvailableTile(tileGid, tileset)){
                expectedTiles.usedTiles.push(tileGid);
                expectedTiles[positionsKey][positionKey] = tileGid;
            }
        }
        return expectedTiles;
    }

    buildExpectedTerrainTiles(resolvedPositions, tileset)
    {
        let expectedTiles = {surroundingTilesPosition: {}, cornersPosition: {}, usedTiles: []};
        this.appendExpectedPositions(
            expectedTiles,
            'surroundingTilesPosition',
            sc.get(resolvedPositions, 'surroundingTilesPosition', {}),
            WangsetPositions.surroundingWangIds(),
            tileset
        );
        this.appendExpectedPositions(
            expectedTiles,
            'cornersPosition',
            sc.get(resolvedPositions, 'cornersPosition', {}),
            WangsetPositions.cornersWangIds(),
            tileset
        );
        return expectedTiles;
    }

    appendPositionsViolations(terrainName, expectedPositions, mappedPositions, validation)
    {
        for(let positionKey of Object.keys(Object.assign({}, expectedPositions, mappedPositions))){
            let expectedTile = Number(sc.get(expectedPositions, positionKey, 0));
            let mappedTile = Number(sc.get(mappedPositions, positionKey, 0));
            validation.checkedPositions++;
            if(expectedTile === mappedTile){
                continue;
            }
            validation.isValid = false;
            validation.violations.push(
                'The terrain "'+terrainName+'" tile for the position "'+positionKey+'" must be "'+expectedTile
                +'" but it is "'+mappedTile+'".'
            );
        }
        return validation;
    }

    comparePositions(terrainName, expectedTiles, mappedTerrain, validation)
    {
        this.appendPositionsViolations(
            terrainName,
            expectedTiles.surroundingTilesPosition,
            mappedTerrain.surroundingTilesPosition,
            validation
        );
        this.appendPositionsViolations(
            terrainName,
            expectedTiles.cornersPosition,
            mappedTerrain.cornersPosition,
            validation
        );
        return validation;
    }

    validateTerrainsMatchResolvedTiles(map, spotsTerrains)
    {
        let tileset = this.fetchMapTileset(map);
        let terrains = sc.get(tileset, 'wangsets', []);
        let validation = {isValid: true, totalTerrains: terrains.length, checkedPositions: 0, violations: []};
        for(let terrain of terrains){
            let resolvedPositions = sc.get(spotsTerrains, terrain.name, false);
            if(!resolvedPositions){
                validation.isValid = false;
                validation.violations.push(
                    'The terrain "'+terrain.name+'" was not resolved for any of the generated spots.'
                );
                continue;
            }
            this.compareTerrainWithExpected(terrain, resolvedPositions, tileset, validation);
        }
        return validation;
    }

    validateTerrainsMatchSourceTerrains(map, optimizedMapFirstTileset)
    {
        let tileset = this.fetchMapTileset(map);
        let terrains = sc.get(tileset, 'wangsets', []);
        let sourceTerrains = sc.get(optimizedMapFirstTileset, 'wangsets', []);
        let sourceFirstGid = Number(sc.get(optimizedMapFirstTileset, 'firstgid', 1));
        let validation = {
            isValid: true,
            totalTerrains: terrains.length,
            matchedTerrains: 0,
            checkedPositions: 0,
            violations: []
        };
        for(let terrain of terrains){
            let sourceTerrain = sourceTerrains.find(sourceWangset => terrain.name === sourceWangset.name);
            if(!sourceTerrain){
                continue;
            }
            validation.matchedTerrains++;
            this.compareTerrainWithExpected(
                terrain,
                this.mapTerrainPositions(terrain.name, sourceTerrain.wangtiles, sourceFirstGid),
                tileset,
                validation
            );
        }
        return validation;
    }

    appendLayerUsedTiles(usedTiles, layer)
    {
        for(let tileGid of sc.get(layer, 'data', [])){
            usedTiles.add(tileGid);
        }
        return usedTiles;
    }

    fetchMapUsedTiles(map)
    {
        let usedTiles = new Set();
        for(let layer of sc.get(map, 'layers', [])){
            this.appendLayerUsedTiles(usedTiles, layer);
        }
        return usedTiles;
    }

    countTerrainTilesInMap(terrain, usedTiles, firstGid)
    {
        let presentTiles = 0;
        for(let wangtile of sc.get(terrain, 'wangtiles', [])){
            if(usedTiles.has(Number(wangtile.tileid) + Number(firstGid))){
                presentTiles++;
            }
        }
        return presentTiles;
    }

    validateTerrainsTilesArePresentInMap(map)
    {
        let tileset = this.fetchMapTileset(map);
        let terrains = sc.get(tileset, 'wangsets', []);
        let usedTiles = this.fetchMapUsedTiles(map);
        let validation = {isValid: true, totalTerrains: terrains.length, presentTerrains: 0, violations: []};
        for(let terrain of terrains){
            let presentTiles = this.countTerrainTilesInMap(terrain, usedTiles, tileset.firstgid);
            if(0 === presentTiles || -1 === terrain.tile){
                validation.isValid = false;
                validation.violations.push(
                    'The terrain "'+terrain.name+'" tiles are not present in the generated map, terrain tile: "'
                    +terrain.tile+'", present tiles: "'+presentTiles+'".'
                );
                continue;
            }
            validation.presentTerrains++;
        }
        return validation;
    }

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {
                label: 'Terrains Match Resolved Tiles Validation',
                run: () => this.validateTerrainsMatchResolvedTiles(map, sc.get(options, 'spotsTerrains', {}))
            },
            {
                label: 'Terrains Match Source Terrains Validation',
                run: () => this.validateTerrainsMatchSourceTerrains(
                    map,
                    sc.get(options, 'optimizedMapFirstTileset', {})
                )
            },
            {
                label: 'Terrains Tiles Present In Map Validation',
                run: () => this.validateTerrainsTilesArePresentInMap(map)
            }
        ]);
    }

}

module.exports.TerrainsValidator = TerrainsValidator;
