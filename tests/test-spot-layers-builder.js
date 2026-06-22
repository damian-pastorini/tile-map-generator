/**
 *
 * Reldens - Test Spot Layers Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotLayersBuilder } = require('../lib/generator/spot-layers-builder');
const { SpotFillProcessor } = require('../lib/generator/spot-fill-processor');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestSpotLayersBuilder extends BaseMapGeneratorTest
{

    buildBuilder()
    {
        return new SpotLayersBuilder(new GeometryCalculator(), null, new LayerDataFactory());
    }

    buildFillProcessor()
    {
        return new SpotFillProcessor(new LayerDataFactory(), new GeometryCalculator(), null);
    }

    async testCreateSpotLayerDataFullFill()
    {
        await this.test('createSpotLayerData fills all tiles at full percentage', async () => {
            let builder = this.buildBuilder();
            let result = builder.createSpotLayerData(3, 3, 100, 5, false, this.buildFillProcessor());
            this.assertEqual(result.length, 9, 'Layer has expected length');
            this.assertEqual(result.filter(tile => 5 === tile).length, 9, 'All tiles filled at full percentage');
        });
    }

    async testCreateVariationsLayerReturnsFalseWithoutVariations()
    {
        await this.test('createVariationsLayer returns false when no variations configured', async () => {
            let builder = this.buildBuilder();
            let config = {width: 3, height: 3};
            let result = builder.createVariationsLayer(config, 'spot', [5, 5, 5], 5, {});
            this.assertEqual(result, false, 'No variations yields false');
        });
    }

    async testSaveLayerElements()
    {
        await this.test('saveLayerElements registers element and quantities', async () => {
            let builder = this.buildBuilder();
            let config = {width: 2, height: 2, freeSpaceAround: 3, allowPathsInFreeSpace: true, splitBordersInLayers: false};
            let layerElements = {};
            let elementsQuantity = {};
            let elementsFreeSpaceAround = {};
            let elementsAllowPathsInFreeSpace = {};
            let mapCenteredElements = {};
            let result = builder.saveLayerElements(
                'spot-1',
                config,
                [5, 5, 5, 5],
                false,
                false,
                false,
                false,
                false,
                layerElements,
                elementsQuantity,
                elementsFreeSpaceAround,
                elementsAllowPathsInFreeSpace,
                mapCenteredElements
            );
            this.assertEqual(result.layerElements['spot-1'].length, 1, 'One layer registered');
            this.assertEqual(result.layerElements['spot-1'][0].name, 'spot-1', 'Layer named after key');
            this.assertEqual(result.elementsQuantity['spot-1'], 1, 'Quantity set to one');
            this.assertEqual(result.elementsFreeSpaceAround['spot-1'], 3, 'Free space recorded');
            this.assertEqual(result.elementsAllowPathsInFreeSpace['spot-1'], true, 'Allow paths recorded');
        });
    }

    async testGenerateInvisibleSpotsSkipsElements()
    {
        await this.test('generateInvisibleSpots skips spots flagged as elements', async () => {
            let builder = this.buildBuilder();
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

}

module.exports.TestSpotLayersBuilder = TestSpotLayersBuilder;
