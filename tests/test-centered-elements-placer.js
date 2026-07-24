/**
 *
 * Reldens - Test Centered Elements Placer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { CenteredElementsPlacer } = require('../lib/generator/centered-elements-placer');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');

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
        if(!overrides){
            return generator;
        }
        return Object.assign(generator, overrides);
    }

    buildPlacementGenerator()
    {
        let placeCalls = [];
        let generator = {
            mapWidth: 10,
            mapHeight: 10,
            mapGrid: Array.from({length: 10}, () => Array(10).fill(true)),
            geometryCalculator: new GeometryCalculator(),
            mapCenteredElements: {house1: 1, tree: 2},
            elementsQuantity: {house1: 1, tree: 2},
            layerElements: {
                house1: [{type: 'tilelayer', width: 2, height: 2}],
                tree: [{type: 'tilelayer', width: 1, height: 1}]
            },
            elementsPlacer: {
                placeElementOnMap: (elementKey, index, position) => placeCalls.push({elementKey, index, position}),
                determineElementFreeSpaceAround: () => 0,
                calculateMinimumFreeSpace: () => 0,
                feasibility: {
                    buildValidator: () => null
                }
            },
            debugHelper: {
                debugAdjacentSpots: async () => {
                    return true;
                }
            }
        };
        generator.mapLayersComposer = new MapLayersComposer(generator);
        generator.placeCalls = placeCalls;
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

    async testPlaceCenteredElementsFullRun()
    {
        await this.test('placeCenteredElements places first and remaining elements around center', async () => {
            let generator = this.buildPlacementGenerator();
            let placer = new CenteredElementsPlacer(generator);
            await placer.placeCenteredElements();
            this.assertEqual(generator.centerPlacedElements.length, 3);
            this.assertEqual(generator.centerPlacedElements[0].type, 'house1');
            this.assertEqual(generator.placeCalls.length, 3);
            this.assertEqual(generator.placeCalls[0].elementKey, 'house1');
            this.assertEqual(generator.elementsQuantity.house1, 0);
            this.assertEqual(generator.elementsQuantity.tree, 0);
            let firstPosition = generator.centerPlacedElements[0].position;
            this.assertEqual(firstPosition.x, 4);
            this.assertEqual(firstPosition.y, 4);
        });
    }

}

module.exports.TestCenteredElementsPlacer = TestCenteredElementsPlacer;
