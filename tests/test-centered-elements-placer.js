/**
 *
 * Reldens - Test Centered Elements Placer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { CenteredElementsPlacer } = require('../lib/generator/centered-elements-placer');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestCenteredElementsPlacer extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            mapWidth: 6,
            mapHeight: 6,
            mapLayersComposer: {},
            elementsPlacer: {
                calculateMinimumFreeSpace: () => 0
            },
            geometryCalculator: new GeometryCalculator(),
            mapGrid: Array.from({length: 6}, () => Array(6).fill(true))
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let placer = new CenteredElementsPlacer(this.buildGeneratorStub());
            this.assert(placer instanceof CenteredElementsPlacer, 'Expected CenteredElementsPlacer instance');
            this.assert('function' === typeof placer.placeCenteredElements, 'Expected placeCenteredElements method');
            this.assert('function' === typeof placer.canPlaceElementCentered, 'Expected canPlaceElementCentered method');
        });
    }

    async testCanPlaceElementCenteredOutOfBounds()
    {
        await this.test('canPlaceElementCentered false when outside the map', async () => {
            let placer = new CenteredElementsPlacer(this.buildGeneratorStub());
            this.assertEqual(placer.canPlaceElementCentered(-1, 0, 2, 2, []), false);
            this.assertEqual(placer.canPlaceElementCentered(5, 5, 2, 2, []), false);
        });
    }

    async testCanPlaceElementCenteredWalkable()
    {
        await this.test('canPlaceElementCentered true on empty walkable map', async () => {
            let placer = new CenteredElementsPlacer(this.buildGeneratorStub());
            this.assertEqual(placer.canPlaceElementCentered(0, 0, 2, 2, []), true);
        });
    }

    async testCanPlaceElementCenteredOverlap()
    {
        await this.test('canPlaceElementCentered false when overlapping placed element', async () => {
            let placer = new CenteredElementsPlacer(this.buildGeneratorStub());
            let placedElements = [{
                type: 'house',
                position: {x: 0, y: 0},
                width: 2,
                height: 2,
                freeSpaceAround: 0
            }];
            this.assertEqual(placer.canPlaceElementCentered(1, 1, 2, 2, placedElements), false);
        });
    }

    async testCanPlaceElementCenteredNoOverlap()
    {
        await this.test('canPlaceElementCentered true when clear of placed element', async () => {
            let placer = new CenteredElementsPlacer(this.buildGeneratorStub());
            let placedElements = [{
                type: 'house',
                position: {x: 0, y: 0},
                width: 1,
                height: 1,
                freeSpaceAround: 0
            }];
            this.assertEqual(placer.canPlaceElementCentered(4, 4, 1, 1, placedElements), true);
        });
    }

    async testPlaceCenteredElementsNoConfigReturns()
    {
        await this.test('placeCenteredElements returns early without centered config', async () => {
            let generator = this.buildGeneratorStub({mapCenteredElements: null});
            let placer = new CenteredElementsPlacer(generator);
            await placer.placeCenteredElements();
            this.assert(!generator.centerPlacedElements, 'Expected no centered elements set');
        });
    }

}

module.exports.TestCenteredElementsPlacer = TestCenteredElementsPlacer;
