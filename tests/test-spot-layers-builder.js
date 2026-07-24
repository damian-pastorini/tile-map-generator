/**
 *
 * Reldens - Test Spot Layers Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotLayersBuilder } = require('../lib/generator/spot-layers-builder');
const { SpotFillProcessor } = require('../lib/generator/spot-fill-processor');
const { SpotBorderAnalyzer } = require('../lib/generator/spot-border-analyzer');
const { SpotBordersAndCorners } = require('../lib/generator/spot-borders-and-corners');
const { SpotPlacement } = require('../lib/generator/spot-placement');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { TileVariationsApplier } = require('../lib/map/tile-variations-applier');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');

let spotTilesShortcuts = {
    p: 1, sTL: 11, sTC: 12, sTR: 13, sML: 14, sMR: 15, sBL: 16,
    sBC: 17, sBR: 18, cTL: 21, cTR: 22, cBL: 23, cBR: 24
};

class TestSpotLayersBuilder extends BaseMapGeneratorTest
{

    async testCreateSpotLayerDataFullFill()
    {
        await this.test('createSpotLayerData fills all tiles at full percentage', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let fillProcessor = new SpotFillProcessor(new LayerDataFactory(), new GeometryCalculator(), null);
            let result = builder.createSpotLayerData(3, 3, 100, 5, false, fillProcessor);
            this.assertEqual(result.length, 9, 'Layer has expected length');
            this.assertEqual(result.filter(tile => 5 === tile).length, 9, 'All tiles filled at full percentage');
        });
    }

    async testCreateSpotLayerDataPartialFill()
    {
        Math.random = this.seedRandom(2024);
        try {
            await this.test('createSpotLayerData fills a subset of tiles at partial percentage', async () => {
                let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
                let fillProcessor = new SpotFillProcessor(new LayerDataFactory(), new GeometryCalculator(), null);
                let result = builder.createSpotLayerData(6, 6, 50, 5, false, fillProcessor);
                this.assertEqual(result.length, 36, 'Layer has expected length');
                let filled = result.filter(tile => 5 === tile).length;
                this.assert(filled > 0, 'Some tiles filled at partial percentage');
                this.assert(filled < 36, 'Not all tiles filled at partial percentage');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testCreateVariationsLayerReturnsFalseWithoutVariations()
    {
        await this.test('createVariationsLayer returns false when no variations configured', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let config = {width: 3, height: 3};
            let result = builder.createVariationsLayer(config, 'spot', [5, 5, 5], 5, {});
            this.assertEqual(result, false, 'No variations yields false');
        });
    }

    async testCreateVariationsLayerAppliesVariations()
    {
        Math.random = this.seedRandom(333);
        try {
            await this.test('createVariationsLayer applies variation tiles over spot tiles', async () => {
                let builder = new SpotLayersBuilder(
                    new GeometryCalculator(),
                    new TileVariationsApplier(),
                    new LayerDataFactory()
                );
                let config = {width: 4, height: 4, spotTileVariations: [26, 27], variableTilesPercentage: 50};
                let spotLayer = new Array(16).fill(5);
                let result = builder.createVariationsLayer(config, 'spot', spotLayer, 5, {});
                this.assertEqual(result.length, 16, 'Variation layer matches spot dimensions');
                let varied = result.filter(tile => 26 === tile || 27 === tile).length;
                this.assert(varied > 0, 'At least one variation tile applied');
                this.assert(varied <= 8, 'Variation count respects the configured percentage');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testSaveLayerElements()
    {
        await this.test('saveLayerElements registers element and quantities', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let config = {width: 2, height: 2, freeSpaceAround: 3, allowPathsInFreeSpace: true, splitBordersInLayers: false};
            let state = {
                layerElements: {},
                elementsQuantity: {},
                elementsFreeSpaceAround: {},
                elementsAllowPathsInFreeSpace: {},
                mapCenteredElements: {}
            };
            let result = builder.saveLayerElements(
                'spot-1',
                config,
                [5, 5, 5, 5],
                false,
                false,
                false,
                false,
                false,
                state.layerElements,
                state.elementsQuantity,
                state.elementsFreeSpaceAround,
                state.elementsAllowPathsInFreeSpace,
                state.mapCenteredElements
            );
            this.assertEqual(result.layerElements['spot-1'].length, 1, 'One layer registered');
            this.assertEqual(result.layerElements['spot-1'][0].name, 'spot-1', 'Layer named after key');
            this.assertEqual(result.elementsQuantity['spot-1'], 1, 'Quantity set to one');
            this.assertEqual(result.elementsFreeSpaceAround['spot-1'], 3, 'Free space recorded');
            this.assertEqual(result.elementsAllowPathsInFreeSpace['spot-1'], true, 'Allow paths recorded');
        });
    }

    async testCreateRandomPathLayerDisabled()
    {
        await this.test('createRandomPathLayer returns false when placeRandomPath is disabled', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let config = {width: 3, height: 3};
            let result = builder.createRandomPathLayer(
                config,
                5,
                [],
                [],
                spotTilesShortcuts,
                null,
                null,
                9,
                1
            );
            this.assertEqual(result, false, 'Disabled random path yields false');
        });
    }

    async testCreateRandomPathLayerNoBorderTiles()
    {
        await this.test('createRandomPathLayer returns false when no border tiles are found', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let config = {width: 3, height: 3, applyCornersTiles: false, borderOuterWalls: false, placeRandomPath: true};
            let emptyBorders = new Array(9).fill(0);
            let emptySpot = new Array(9).fill(0);
            let result = builder.createRandomPathLayer(
                config,
                5,
                emptyBorders,
                emptySpot,
                spotTilesShortcuts,
                analyzer,
                null,
                9,
                1
            );
            this.assertEqual(result, false, 'No border tiles yields false');
        });
    }

    async testCreateRandomPathLayerBuildsPath()
    {
        Math.random = this.seedRandom(8080);
        try {
            await this.test('createRandomPathLayer builds a path layer along a border sequence', async () => {
                let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
                let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
                let bordersAndCorners = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
                let config = {width: 5, height: 5, applyCornersTiles: false, borderOuterWalls: false, placeRandomPath: true};
                let bordersLayer = new Array(25).fill(0);
                bordersLayer[0] = 5;
                bordersLayer[1] = 5;
                bordersLayer[2] = 5;
                bordersLayer[3] = 5;
                bordersLayer[4] = 5;
                let spotLayer = new Array(25).fill(0);
                let result = builder.createRandomPathLayer(
                    config,
                    5,
                    bordersLayer,
                    spotLayer,
                    spotTilesShortcuts,
                    analyzer,
                    bordersAndCorners,
                    9,
                    3
                );
                this.assert(result, 'A path layer object is returned');
                this.assertEqual(result.pathLayer.name, 'path', 'Path layer named path');
                this.assertEqual(result.pathLayer.width, 5, 'Path layer width matches spot width');
                this.assertEqual(result.pathLayer.data.filter(tile => 9 === tile).length, 1, 'Single path tile placed');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testGenerateInvisibleSpotsSkipsElements()
    {
        await this.test('generateInvisibleSpots skips spots flagged as elements', async () => {
            let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
            let generatedSpots = {only: {isElement: true, width: 2, height: 2, spotLayers: {a: [1, 1, 1, 1]}}};
            let spotPlacement = {findFreeSpotPlacement: () => ({x: 0, y: 0})};
            let staticLayers = builder.generateInvisibleSpots(
                [],
                generatedSpots,
                4,
                4,
                spotPlacement,
                (name, data) => ({name, data})
            );
            this.assertEqual(staticLayers.length, 0, 'Element spots produce no static layers');
        });
    }

    async testGenerateInvisibleSpotsPlacesSpot()
    {
        Math.random = this.seedRandom(909);
        try {
            await this.test('generateInvisibleSpots maps a spot layer onto the map grid', async () => {
                let builder = new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
                let generatedSpots = {
                    area: {isElement: false, width: 2, height: 2, spotLayers: {'inv-1': [1, 1, 1, 1]}}
                };
                let spotPlacement = new SpotPlacement(new GeometryCalculator());
                let staticLayers = builder.generateInvisibleSpots(
                    [],
                    generatedSpots,
                    6,
                    6,
                    spotPlacement,
                    (name, data) => ({name, data})
                );
                this.assertEqual(staticLayers.length, 1, 'One static spot layer produced');
                this.assertEqual(staticLayers[0].name, 'inv-1', 'Static layer keeps the spot layer name');
                this.assertEqual(staticLayers[0].data.length, 36, 'Static layer spans the full map');
                this.assertEqual(staticLayers[0].data.filter(tile => 1 === tile).length, 4, 'Spot tiles mapped onto the grid');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

}

module.exports.TestSpotLayersBuilder = TestSpotLayersBuilder;
