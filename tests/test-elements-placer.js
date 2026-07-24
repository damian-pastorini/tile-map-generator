/**
 *
 * Reldens - Test Elements Placer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementsPlacer } = require('../lib/generator/elements-placer');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');
const { ElementLayerName } = require('../lib/map/element-layer-name');

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
        return overrides ? Object.assign(generator, overrides) : generator;
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

    async testGenerateAdditionalLayers()
    {
        await this.test('generateAdditionalLayers adds one layer per unique visible name', async () => {
            let generator = this.buildGeneratorStub({
                mapWidth: 2,
                mapHeight: 2,
                additionalLayers: [],
                layerElements: {
                    tree: [
                        {type: 'tilelayer', name: 'tree-below', visible: true},
                        {type: 'tilelayer', name: 'tree-below', visible: true},
                        {type: 'tilelayer', name: 'tree-hidden', visible: false}
                    ]
                },
                generateLayerWithData: (name, data) => {
                    return {name, data, type: 'tilelayer'};
                }
            });
            let placer = new ElementsPlacer(generator);
            placer.generateAdditionalLayers();
            this.assertEqual(generator.additionalLayers.length, 1);
            this.assertEqual(generator.additionalLayers[0].name, 'tree-below');
            this.assertEqual(generator.additionalLayers[0].data.length, 4);
        });
    }

    recordingWriter(writerCalls)
    {
        return {
            updateLayerData: (layer) => {
                writerCalls.push({name: layer.name, position: layer.position});
            }
        };
    }

    buildWriterGenerator(layerElements, writerCalls)
    {
        return this.buildGeneratorStub({
            mapWidth: 4,
            mapHeight: 4,
            mapName: 'town-01',
            generatedFloorData: {},
            additionalLayers: [],
            layerElements: layerElements,
            elementLayerWriter: this.recordingWriter(writerCalls),
            elementLayerName: new ElementLayerName(),
            placedElementsJournal: []
        });
    }

    async testPlaceElementOnMapWithPosition()
    {
        await this.test('placeElementOnMap writes element layer at provided position', async () => {
            let writerCalls = [];
            let layerElements = {
                tree: [{type: 'tilelayer', name: 'tree-below', visible: true, width: 1, height: 1, data: [1]}]
            };
            let placer = new ElementsPlacer(this.buildWriterGenerator(layerElements, writerCalls));
            placer.placeElementOnMap('tree', 0, {x: 1, y: 1});
            this.assertEqual(writerCalls.length, 1);
            this.assertEqual(writerCalls[0].position.x, 1);
            this.assertEqual(writerCalls[0].position.y, 1);
            this.assertEqual(writerCalls[0].name, 'tree-below');
        });
    }

    async testPlaceElementOnMapStairsRecordsFloorData()
    {
        await this.test('placeElementOnMap records floor data for stairs elements', async () => {
            let writerCalls = [];
            let layerElements = {
                'stairs-up': [{type: 'tilelayer', name: 'stairs-up-base', visible: true, width: 1, height: 1, data: [2]}]
            };
            let generator = this.buildWriterGenerator(layerElements, writerCalls);
            let placer = new ElementsPlacer(generator);
            placer.placeElementOnMap('stairs-up', 0, {x: 2, y: 3});
            this.assertEqual(generator.generatedFloorData['stairs-up'].x, 2);
            this.assertEqual(generator.generatedFloorData['stairs-up'].y, 3);
        });
    }

    async testPrePlaceStairsActivePlacesFromPreviousFloor()
    {
        await this.test('prePlaceStairs places stairs-up from previous down floor', async () => {
            let placeCalls = [];
            let generator = this.buildGeneratorStub({
                elementsQuantity: {'stairs-up': 1, 'stairs-down': 0},
                previousFloorData: {floorKey: 'down', 'stairs-down': {x: 1, y: 1}, 'stairs-up': false}
            });
            let placer = new ElementsPlacer(generator);
            placer.placeElementOnMap = (elementType, number, position) => {
                placeCalls.push({elementType, number, position});
            };
            placer.prePlaceStairs();
            this.assertEqual(placeCalls.length, 1);
            this.assertEqual(placeCalls[0].elementType, 'stairs-up');
            this.assertEqual(placeCalls[0].position.x, 1);
            this.assert(!('stairs-up' in generator.elementsQuantity), 'stairs-up quantity must be deleted');
        });
    }

    async testPlaceElementsThroughGeneration()
    {
        await this.test('placeElements produces element layers during real generation', async () => {
            let config = this.setupBasicConfig();
            Math.random = this.seedRandom(4242);
            try {
                let map = await this.testCurrentGeneration(config);
                this.assert(map, 'Expected a generated map');
                let elementLayers = map.layers.filter(layer =>
                    'ground' !== layer.name
                    && 'path' !== layer.name
                    && 'collisions-map-border' !== layer.name
                    && 'ground-variations' !== layer.name
                );
                this.assert(0 < elementLayers.length, 'Expected at least one element layer');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

}

module.exports.TestElementsPlacer = TestElementsPlacer;
