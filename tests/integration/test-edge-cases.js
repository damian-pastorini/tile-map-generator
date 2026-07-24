/**
 *
 * Reldens - Test Edge Cases
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { sc } = require('@reldens/utils');

class TestEdgeCases extends BaseFunctionalityTest
{

    constructor()
    {
        super();
    }

    async testMinimumMapSize()
    {
        let config = this.setupBasicConfig();
        config.mapSize = {mapWidth: 3, mapHeight: 3};
        await this.testWithDeterministicSeed('Minimum map size handling', config, 10001, async (map, config) => {
            this.assert(map, 'Map must be generated for minimum size');
            this.assertEqual(map.width, 3, 'Map width must match minimum');
            this.assert(3 <= map.height, 'Map height must be at least the minimum, auto grow may extend it');
            this.assert(0 < map.layers.length, 'Minimum map must have layers');
            for(let layer of map.layers){
                this.assertEqual(layer.data.length, map.width * map.height, 'Layer data must match the final map size');
            }
        });
    }

    async testMaximumMapSize()
    {
        let config = this.setupBasicConfig();
        config.mapSize = {mapWidth: 500, mapHeight: 500};
        await this.testWithDeterministicSeed('Maximum map size handling', config, 10002, async (map, config) => {
            this.assert(map, 'Map must be generated for maximum size');
            this.assertEqual(map.width, 500, 'Map width must match maximum');
            this.assertEqual(map.height, 500, 'Map height must match maximum');
            this.assert(0 < map.layers.length, 'Maximum map must have layers');
        });
    }

    async testExtremeElementQuantities()
    {
        let config = this.setupBasicConfig();
        config.width = 50;
        config.height = 50;
        config.elementsQuantity = {
            'tree': 100
        };
        await this.testWithDeterministicSeed('Extreme element quantities', config, 10004, async (map, config) => {
            this.assert(map, 'Map must handle extreme element quantities');
            let treeLayers = map.layers.filter(layer => {
                let layerName = sc.get(layer, 'name', '');
                return -1 !== layerName.indexOf('tree');
            });
            this.assert(0 < treeLayers.length, 'Tree layers must exist for extreme quantities');
        });
    }

    async testConflictingTileValues()
    {
        let config = this.setupBasicConfig();
        config.width = 15;
        config.height = 15;
        config.pathTile = 5;
        config.groundTile = 5;
        config.wallTile = 5;
        await this.testWithDeterministicSeed('Conflicting tile values', config, 10005, async (map, config) => {
            this.assert(map, 'Map must be generated despite conflicting tile values');
            this.assert(0 < map.layers.length, 'Must have layers despite conflicts');
        });
    }

    async testInvalidTileDimensions()
    {
        let config = this.setupBasicConfig();
        config.width = 10;
        config.height = 10;
        delete config.tileSize;
        await this.test('Invalid tile dimensions (seed: 10006)', async () => {
            let result = await this.testCurrentGeneration(config);
            if(result){
                this.assert(false, 'Should have failed with missing tileSize');
            }
            let validationError = this.getLastValidationError(config);
            this.assert(validationError && -1 !== validationError.indexOf('tileSize'), 'Should indicate missing tileSize');
        });
    }

    async testExtremeVariationPercentage()
    {
        let config = this.setupBasicConfig();
        config.width = 20;
        config.height = 20;
        config.randomGroundTiles = [10, 11, 12];
        config.variableTilesPercentage = 100;
        await this.testWithDeterministicSeed('Extreme variation percentage', config, 10007, async (map, config) => {
            this.assert(map, 'Map must handle 100% variation percentage');
            let groundVariationsLayer = this.mapValidator.findLayerByName(map, 'ground-variations');
            if(groundVariationsLayer){
                let nonZeroTiles = groundVariationsLayer.data.filter(tile => 0 !== tile);
                this.assert(0 < nonZeroTiles.length, 'Must have variation tiles for 100% percentage');
            }
        });
    }

    async testZeroPathSize()
    {
        let config = this.setupBasicConfig();
        config.width = 15;
        config.height = 15;
        config.mainPathSize = 0;
        await this.testWithDeterministicSeed('Zero path size', config, 10008, async (map, config) => {
            this.assert(map, 'Map must handle zero path size');
            let pathLayer = this.mapValidator.findLayerByName(map, 'path');
            if(pathLayer){
                let pathTiles = pathLayer.data.filter(tile => config.pathTile === tile);
                this.assert(0 <= pathTiles.length, 'Path tiles count must be valid for zero size');
            }
        });
    }

    async testExtremeMapAspectRatio()
    {
        let config = this.setupBasicConfig();
        config.mapSize = {mapWidth: 100, mapHeight: 5};
        await this.testWithDeterministicSeed('Extreme map aspect ratio', config, 10009, async (map, config) => {
            this.assert(map, 'Map must handle extreme aspect ratios');
            this.assertEqual(map.width, 100, 'Wide map width must be preserved');
            this.assert(5 <= map.height, 'Narrow map height must be at least the configured value, auto grow may extend it');
        });
    }

    async testInvalidFreeSpaceConfiguration()
    {
        let config = this.setupBasicConfig();
        config.width = 10;
        config.height = 10;
        config.elementsQuantity = {'house1': 5};
        config.minimumElementsFreeSpaceAround = 50;
        await this.testWithDeterministicSeed('Invalid free space configuration', config, 10010, async (map, config) => {
            this.assert(map, 'Map generation should succeed despite large free space requirements');
            this.assert(0 < map.layers.length, 'Map should have layers');
        });
    }

    async testInvalidCornerConfiguration()
    {
        let config = this.setupCompositeConfig();
        config.width = 12;
        config.height = 12;
        config.applyPathsInnerWalls = true;
        config.corners = {
            'invalid-key': 20,
            '2,2': 21
        };
        await this.testWithDeterministicSeed('Invalid corner configuration', config, 10012, async (map, config) => {
            this.assert(map, 'Map must handle invalid corner configurations');
            this.assert(0 < map.layers.length, 'Must have layers despite invalid corners');
        });
    }

    async testSingleTileMap()
    {
        let config = this.setupBasicConfig();
        // Create a 1x1 element
        config.layerElements = {
            'single': [{
                type: 'tilelayer',
                name: 'single',
                width: 1,
                height: 1,
                data: [config.groundTile],
                visible: true
            }]
        };
        config.elementsQuantity = {'single': 1};
        await this.testWithDeterministicSeed('Single tile map', config, 10013, async (map, config) => {
            this.assert(map, 'Single tile map should generate successfully');
            this.assert(map.width >= 1, 'Single tile map width must be at least 1');
            this.assert(map.height >= 1, 'Single tile map height must be at least 1');
            this.assert(0 < map.layers.length, 'Single tile map must have layers');
        });
    }

    async testNegativeConfigValues()
    {
        let config = this.setupBasicConfig();
        config.mapSize = {mapWidth: -5, mapHeight: -10};
        config.mainPathSize = -2;
        config.variableTilesPercentage = -15;
        await this.test('Negative config values (seed: 10014)', async () => {
            let result = await this.testCurrentGeneration(config);
            this.assert(!result, 'Map generation must fail for negative configuration values');
        });
    }

    async testExcessiveWallConfiguration()
    {
        let config = this.setupCompositeConfig();
        config.width = 8;
        config.height = 8;
        config.applyPathsInnerWalls = true;
        config.applyPathsOuterWalls = true;
        config.surroundingTiles = {
            '-1,-1': 10, '-1,0': 11, '-1,1': 12,
            '0,-1': 13, '0,1': 14,
            '1,-1': 15, '1,0': 16, '1,1': 17,
            '2,2': 18, '3,3': 19
        };
        await this.testWithDeterministicSeed('Excessive wall configuration', config, 10015, async (map, config) => {
            this.assert(map, 'Map must handle excessive wall configurations');
            let wallLayers = map.layers.filter(layer => {
                let layerName = sc.get(layer, 'name', '');
                return -1 !== layerName.indexOf('wall');
            });
            this.assert(0 <= wallLayers.length, 'Wall layers must be handled properly');
        });
    }

}

module.exports.TestEdgeCases = TestEdgeCases;
