/**
 *
 * Reldens - Test Spot Fill Processor
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotFillProcessor } = require('../lib/generator/spot-fill-processor');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestSpotFillProcessor extends BaseMapGeneratorTest
{

    buildProcessor()
    {
        return new SpotFillProcessor(new LayerDataFactory(), new GeometryCalculator(), {
            mergeLayers: (layerA, layerB) => layerA.map((tile, index) => 0 !== tile ? tile : layerB[index])
        });
    }

    async testComputeTotalTiles()
    {
        await this.test('computeTotalTiles handles borders and full fill', async () => {
            let processor = this.buildProcessor();
            this.assertEqual(processor.computeTotalTiles(4, 5, false), 20, 'Full fill is area');
            this.assertEqual(processor.computeTotalTiles(4, 5, true), 6, 'Bordered fill excludes edges');
            this.assertEqual(processor.computeTotalTiles(2, 5, true), 0, 'Too small with borders is zero');
        });
    }

    async testFillAllTilesNoBorders()
    {
        await this.test('fillAllTiles fills entire layer when borders disabled', async () => {
            let processor = this.buildProcessor();
            let result = processor.fillAllTiles(new Array(9).fill(0), 3, 3, 5, false);
            this.assertEqual(result.filter(tile => 5 === tile).length, 9, 'All nine tiles filled');
        });
    }

    async testFillAllTilesWithBorders()
    {
        await this.test('fillAllTiles fills only interior when borders enabled', async () => {
            let processor = this.buildProcessor();
            let result = processor.fillAllTiles(new Array(9).fill(0), 3, 3, 5, true);
            this.assertEqual(result[4], 5, 'Center filled');
            this.assertEqual(result[0], 0, 'Corner left empty');
            this.assertEqual(result.filter(tile => 5 === tile).length, 1, 'Only interior tile filled');
        });
    }

    async testIsInternalHole()
    {
        await this.test('isInternalHole requires at least six filled neighbors', async () => {
            let processor = this.buildProcessor();
            let surrounded = [5, 5, 5, 5, 0, 5, 5, 5, 5];
            this.assert(processor.isInternalHole(1, 1, surrounded, 3, 3), 'Fully surrounded is hole');
            let sparse = [5, 0, 0, 0, 0, 0, 0, 0, 5];
            this.assert(!processor.isInternalHole(1, 1, sparse, 3, 3), 'Sparse neighbors not a hole');
        });
    }

    async testFillInternalHolesAndBalancePerimeter()
    {
        await this.test('fillInternalHolesAndBalancePerimeter fills surrounded empty tile', async () => {
            let processor = this.buildProcessor();
            let layer = [5, 5, 5, 5, 0, 5, 5, 5, 5];
            let result = processor.fillInternalHolesAndBalancePerimeter(layer, 3, 3, 5, false);
            this.assertEqual(result[4], 5, 'Internal hole filled');
        });
    }

    async testIncreaseLayerSize()
    {
        await this.test('increaseLayerSize pads layer dimensions and data', async () => {
            let processor = this.buildProcessor();
            let result = processor.increaseLayerSize([5, 5, 5, 5], 2, 2, 1);
            this.assertEqual(result.width, 4, 'Width padded by two');
            this.assertEqual(result.height, 4, 'Height padded by two');
            this.assertEqual(result.layerData.length, 16, 'Data length matches new dimensions');
            this.assertEqual(result.layerData[5], 5, 'Original tile shifted into padded position');
        });
    }

}

module.exports.TestSpotFillProcessor = TestSpotFillProcessor;
