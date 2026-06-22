/**
 *
 * Reldens - Test Elements Placer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementsPlacer } = require('../lib/generator/elements-placer');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');

class TestElementsPlacer extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            minimumElementsFreeSpaceAround: 1,
            pathSize: 1,
            elementsFreeSpaceAround: {},
            elementsAllowPathsInFreeSpace: {},
            defaultElementsAllowPathsInFreeSpace: false,
            elementsProvider: {},
            elementsQuantity: {},
            layerElements: {}
        };
        generator.mapLayersComposer = new MapLayersComposer(generator);
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub());
            this.assert(placer instanceof ElementsPlacer, 'Expected ElementsPlacer instance');
            this.assert('function' === typeof placer.placeElements, 'Expected placeElements method');
            this.assert('function' === typeof placer.calculateMinimumFreeSpace, 'Expected calculateMinimumFreeSpace method');
        });
    }

    async testCalculateMinimumFreeSpaceDefault()
    {
        await this.test('calculateMinimumFreeSpace returns base value with pathSize 1', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub({minimumElementsFreeSpaceAround: 2, pathSize: 1}));
            this.assertEqual(placer.calculateMinimumFreeSpace(), 2);
        });
    }

    async testCalculateMinimumFreeSpaceWithLargerPath()
    {
        await this.test('calculateMinimumFreeSpace honors larger pathSize', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub({minimumElementsFreeSpaceAround: 1, pathSize: 3}));
            this.assertEqual(placer.calculateMinimumFreeSpace(), 3);
        });
    }

    async testDetermineElementFreeSpaceAroundFromConfig()
    {
        await this.test('determineElementFreeSpaceAround reads element config', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub({
                elementsFreeSpaceAround: {tree: 4},
                minimumElementsFreeSpaceAround: 1
            }));
            this.assertEqual(placer.determineElementFreeSpaceAround('tree'), 4);
        });
    }

    async testDetermineElementFreeSpaceAroundFallback()
    {
        await this.test('determineElementFreeSpaceAround falls back to minimum', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub({
                elementsFreeSpaceAround: {},
                minimumElementsFreeSpaceAround: 2
            }));
            this.assertEqual(placer.determineElementFreeSpaceAround('tree'), 2);
        });
    }

    async testDetermineElementAllowPathsInFreeSpace()
    {
        await this.test('determineElementAllowPathsInFreeSpace reads element flag', async () => {
            let placer = new ElementsPlacer(this.buildGeneratorStub({
                elementsAllowPathsInFreeSpace: {tree: true},
                defaultElementsAllowPathsInFreeSpace: false
            }));
            this.assertEqual(placer.determineElementAllowPathsInFreeSpace('tree'), true);
            this.assertEqual(placer.determineElementAllowPathsInFreeSpace('house'), false);
        });
    }

    async testSortedElementsQuantityBySizeDescending()
    {
        await this.test('sortedElementsQuantity orders keys by area descending', async () => {
            let generator = this.buildGeneratorStub({
                elementsQuantity: {tree: 2, house: 1},
                layerElements: {
                    tree: [{type: 'tilelayer', width: 1, height: 1}],
                    house: [{type: 'tilelayer', width: 3, height: 3}]
                }
            });
            let placer = new ElementsPlacer(generator);
            let sorted = placer.sortedElementsQuantity();
            let keys = Object.keys(sorted);
            this.assertEqual(keys[0], 'house');
            this.assertEqual(keys[1], 'tree');
            this.assertEqual(sorted.house, 1);
            this.assertEqual(sorted.tree, 2);
        });
    }

    async testPrePlaceStairsReturnsWithoutPreviousFloor()
    {
        await this.test('prePlaceStairs returns when no previous floor data', async () => {
            let generator = this.buildGeneratorStub({
                elementsQuantity: {'stairs-up': 1, 'stairs-down': 0},
                previousFloorData: {}
            });
            let placer = new ElementsPlacer(generator);
            placer.prePlaceStairs();
            this.assertEqual(generator.elementsQuantity['stairs-up'], 1);
        });
    }

}

module.exports.TestElementsPlacer = TestElementsPlacer;
