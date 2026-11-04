/**
 *
 * Reldens - Test Walls Generation
 *
 * The spot walls cases prove a ground spot does NOT require a wangset to get its borders and walls. The tiles for
 * a spot are resolved from any of the three supported sources, in this order: the tiles "key" properties
 * annotations (groundSpotsPropertiesMappers), a wangset named exactly as the spot tiles key, or the configured
 * surroundingTiles and corners. The cases below use no wangsets at all.
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { WallsValidator } = require('../../lib/validator/walls-validator');
const { PropertiesMapper } = require('../../lib/generator/properties-mapper');
const { LayerUtility } = require('../../lib/map/layer-utility');
const { TileCountingUtility } = require('../../lib/map/tile-counting-utility');
const { sc } = require('@reldens/utils');

class TestWallsGeneration extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.wallsValidator = new WallsValidator();
        this.innerWallsSurroundingTiles = {'-1,0': 100, '0,-1': 101, '0,0': 102, '0,1': 103};
        this.innerWallsCornersTiles = {'-1,-1': 104, '-1,1': 105, '1,-1': 106, '1,1': 107};
    }

    setupSpotWallsConfig()
    {
        let config = this.setupBasicConfig();
        config.groundSpots = {
            'wall-test-spot': {
                quantity: 1,
                width: 8,
                height: 8,
                walkable: false,
                layerName: 'ground-spot-wall-test',
                tilesKey: 'wall-test-spot',
                spotTile: 116,
                isElement: true,
                splitBordersInLayers: true,
                borderInnerWalls: true,
                borderOuterWalls: false,
                applyCornersTiles: true
            }
        };
        config.freeSpaceTilesQuantity = 3;
        return config;
    }

    setupSpotWallsTilesMappers()
    {
        let innerWallsMapper = new PropertiesMapper('wall-test-spot-inner-walls');
        innerWallsMapper.map(this.innerWallsSurroundingTiles, this.innerWallsCornersTiles);
        return {'wall-test-spot-inner-walls': innerWallsMapper};
    }

    fetchConfiguredSpotTiles(surroundingTiles, corners)
    {
        return this.wallsValidator.wallCornersValidator.fetchTilesValues(surroundingTiles).concat(
            this.wallsValidator.wallCornersValidator.fetchTilesValues(corners)
        );
    }

    countTilesFromList(layerData, allowedTiles)
    {
        let matchedTiles = 0;
        for(let tile of layerData){
            if(-1 !== allowedTiles.indexOf(tile)){
                matchedTiles++;
            }
        }
        return matchedTiles;
    }

    assertNotApplicable(validation, expectedReason, label)
    {
        this.logFunctionalityResult(label, validation);
        this.assert(validation.isValid, label+' must not report a failure');
        this.assertEqual(
            validation.reason,
            expectedReason,
            'The town composite carries no config level tiles, so '+label+' must report itself as not applicable '
            +'instead of passing silently, got: '+sc.toJsonString(validation)
        );
    }

    async testInnerWallsPlacement()
    {
        let config = this.setupCompositeConfig();
        await this.testWithDeterministicSeed('Inner walls placement', config, 13579, async (map, config) => {
            let validation = this.wallsValidator.validateInnerWallPlacement(map, config);
            this.assertNotApplicable(validation, 'No surrounding tiles configured', 'Inner Walls Placement');
        });
    }

    async testOuterWallsPlacement()
    {
        let config = this.setupCompositeConfig();
        await this.testWithDeterministicSeed('Outer walls placement', config, 24680, async (map, config) => {
            let validation = this.wallsValidator.validateOuterWallPlacement(map, config);
            this.assertNotApplicable(validation, 'No outer walls tiles configured', 'Outer Walls Placement');
        });
    }

    async testWallTileTypesCorrect()
    {
        let config = this.setupCompositeConfig();
        await this.testWithDeterministicSeed('Wall tile types correct', config, 97531, async (map, config) => {
            let validation = this.wallsValidator.validateWallTileTypes(map, config);
            this.assertNotApplicable(validation, 'No surrounding tiles configured', 'Wall Tile Types');
        });
    }

    async testCornerTilePlacement()
    {
        let config = this.setupCompositeConfig();
        await this.testWithDeterministicSeed('Corner tile placement', config, 86420, async (map, config) => {
            let validation = this.wallsValidator.wallCornersValidator.validateCornerTilePlacement(map, config);
            this.assertNotApplicable(validation, 'No corner tiles configured', 'Corner Tile Placement');
        });
    }

    async testSpotBorderTilesReachTheGeneratedMap()
    {
        let config = this.setupSpotWallsConfig();
        let testName = 'Spot border tiles reach the generated map without any wangset';
        await this.testWithDeterministicSeed(testName, config, 32323, async (map, config) => {
            let bordersLayer = LayerUtility.findLayer(map, '-borders');
            this.assert(
                bordersLayer,
                'A spot with splitBordersInLayers must produce a borders layer, layers: '
                +map.layers.map(layer => layer.name).join(', ')
            );
            let configuredTiles = this.fetchConfiguredSpotTiles(config.surroundingTiles, config.corners);
            this.assert(
                0 < this.countTilesFromList(bordersLayer.data, configuredTiles),
                'The spot borders layer must contain the configured surrounding and corners tiles, and never '
                +'undefined tiles, found: '+TileCountingUtility.countNonZeroTiles(bordersLayer.data)+' non zero tiles'
            );
        });
    }

    async testSpotInnerWallsLayerIsCreatedAndNotEmpty()
    {
        let config = this.setupSpotWallsConfig();
        config.groundSpotsPropertiesMappers = this.setupSpotWallsTilesMappers();
        let testName = 'Spot inner walls are generated from the tiles properties mappers without any wangset';
        await this.testWithDeterministicSeed(testName, config, 45454, async (map) => {
            let innerWallsLayer = LayerUtility.findLayer(map, '-inner-walls');
            this.assert(
                innerWallsLayer,
                'A spot with borderInnerWalls must produce an inner walls layer, layers: '
                +map.layers.map(layer => layer.name).join(', ')
            );
            let innerWallsTiles = this.fetchConfiguredSpotTiles(
                this.innerWallsSurroundingTiles,
                this.innerWallsCornersTiles
            );
            this.assert(
                0 < this.countTilesFromList(innerWallsLayer.data, innerWallsTiles),
                'The spot inner walls layer must contain the mapped inner walls tiles, found: '
                +TileCountingUtility.countNonZeroTiles(innerWallsLayer.data)+' non zero tiles'
            );
        });
    }

}

module.exports.TestWallsGeneration = TestWallsGeneration;
