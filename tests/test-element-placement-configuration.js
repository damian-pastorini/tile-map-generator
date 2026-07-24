/**
 *
 * Reldens - Test Element Placement Configuration
 *
 * Real-map proving tests for the element placement configuration options. Every case generates a complete map
 * using the committed real element files (house-001.json, house-002.json and tree.json) under a
 * fixed seed, and compares the full result against a per-case committed deterministic expected map file under
 * tests/test-data (materialized on first run, then committed). Each case also proves the exact element
 * instance bounds on the generated map, so the effect of every configuration option (placeElementsOrder,
 * orderElementsBySize, elementsFreeSpaceAround, randomizeQuantities, mapCenteredElements grid placement,
 * placeElementsCloserToBorders and minimumDistanceFromBorders) can be verified visually by opening the
 * expected map in Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TestElementPlacementConfiguration extends BaseExpectedMapTest
{

    buildHousesAndTreeConfig(mapName, orderElementsBySize, placeElementsOrder)
    {
        let config = this.applyScenarioDefaults(this.setupComplexConfig(), mapName, 40, 40);
        config.elementsQuantity = {house1: 1, house2: 1, tree: 1};
        config.elementsFreeSpaceAround = {house1: 1, house2: 1, tree: 1};
        config.orderElementsBySize = orderElementsBySize;
        config.placeElementsOrder = placeElementsOrder;
        config.randomizeQuantities = false;
        return config;
    }

    buildTreesOnlyConfig(mapName, treesFreeSpaceAround)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        delete config.layerElements.house1;
        config.elementsQuantity = {tree: 3};
        config.elementsFreeSpaceAround = {tree: treesFreeSpaceAround};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'inOrder';
        config.randomizeQuantities = false;
        return config;
    }

    buildRandomizedConfig(mapName)
    {
        let config = this.applyScenarioDefaults(this.setupComplexConfig(), mapName, 40, 40);
        config.elementsQuantity = {house1: 1, house2: 1, tree: 2};
        config.elementsFreeSpaceAround = {house1: 2, house2: 2, tree: 1};
        config.orderElementsBySize = true;
        config.placeElementsOrder = 'random';
        config.randomizeQuantities = true;
        return config;
    }

    buildCenteredGridHousesConfig(mapName, treesPlacementOrder)
    {
        let config = this.applyScenarioDefaults(this.setupComplexConfig(), mapName, 40, 40);
        config.elementsQuantity = {house1: 1, house2: 2, tree: 3};
        config.elementsFreeSpaceAround = {house1: 1, house2: 1, tree: 1};
        config.mapCenteredElements = {house1: 1, house2: 2};
        config.orderElementsBySize = false;
        config.placeElementsOrder = treesPlacementOrder;
        config.randomizeQuantities = false;
        return config;
    }

    buildCloserToBordersConfig(mapName)
    {
        let config = this.applyScenarioDefaults(this.setupComplexConfig(), mapName, 40, 40);
        config.elementsQuantity = {house1: 1, house2: 1, tree: 2};
        config.elementsFreeSpaceAround = {house1: 1, house2: 1, tree: 1};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'random';
        config.placeElementsCloserToBorders = true;
        config.randomizeQuantities = false;
        return config;
    }

    buildMinimumDistanceConfig(mapName)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.elementsQuantity = {house1: 1, tree: 1};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'inOrder';
        config.minimumDistanceFromBorders = 4;
        return config;
    }

    buildOakTieConfig(mapName)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.layerElements.oak = FileHandler.fetchFileJson(
            FileHandler.joinPaths(this.testDataFolder, 'tree.json')
        ).layers;
        config.elementsQuantity = {tree: 1, oak: 1};
        config.elementsFreeSpaceAround = {tree: 1, oak: 1};
        config.orderElementsBySize = true;
        config.placeElementsOrder = 'inOrder';
        return config;
    }

    async runPlacementScenario(config, seed, expectedFileName, expectedBounds, boundsMessage)
    {
        let result = await this.runExpectedMapScenario(config, seed, expectedFileName);
        this.assertElementBounds(result.map, config, expectedBounds, boundsMessage);
        return result.map;
    }

    async testInOrderPlacementMatchesCommittedExpectedMap()
    {
        await this.test('placeElementsOrder inOrder with orderElementsBySize false matches its expected map', async () => {
            await this.runPlacementScenario(
                this.buildHousesAndTreeConfig('element-placement-in-order', false, 'inOrder'),
                24680,
                'element-placement-in-order-expected.json',
                [
                    {element: 'house1-0', x: 1, y: 1, width: 7, height: 9},
                    {element: 'house2-0', x: 9, y: 1, width: 7, height: 12},
                    {element: 'tree-0', x: 17, y: 1, width: 6, height: 8}
                ],
                'Input order must place house1 on the first scan position, then house2, then the tree'
            );
        });
    }

    async testOrderBySizePlacementMatchesCommittedExpectedMap()
    {
        await this.test('orderElementsBySize true places the largest element first and matches its expected map', async () => {
            await this.runPlacementScenario(
                this.buildHousesAndTreeConfig('element-placement-by-size', true, 'inOrder'),
                24680,
                'element-placement-by-size-expected.json',
                [
                    {element: 'house1-0', x: 9, y: 1, width: 7, height: 9},
                    {element: 'house2-0', x: 1, y: 1, width: 7, height: 12},
                    {element: 'tree-0', x: 17, y: 1, width: 6, height: 8}
                ],
                'Ordering by size must give the largest element (house2, 7x13) the first scan position'
            );
        });
    }

    async testFreeSpaceZeroPacksTreesOnExpectedMap()
    {
        await this.test('elementsFreeSpaceAround zero packs the three trees and matches its expected map', async () => {
            await this.runPlacementScenario(
                this.buildTreesOnlyConfig('element-placement-free-space-zero', 0),
                13579,
                'element-placement-free-space-zero-expected.json',
                [
                    {element: 'tree-0', x: 1, y: 1, width: 6, height: 8},
                    {element: 'tree-1', x: 7, y: 1, width: 6, height: 8},
                    {element: 'tree-2', x: 13, y: 1, width: 6, height: 8}
                ],
                'Zero free space must pack the three trees edge to edge on the first row at x 1, 7 and 13'
            );
        });
    }

    async testFreeSpaceThreeSeparatesTreesOnExpectedMap()
    {
        await this.test('elementsFreeSpaceAround three separates the three trees and matches its expected map', async () => {
            await this.runPlacementScenario(
                this.buildTreesOnlyConfig('element-placement-free-space-three', 3),
                13579,
                'element-placement-free-space-three-expected.json',
                [
                    {element: 'tree-0', x: 1, y: 1, width: 6, height: 8},
                    {element: 'tree-1', x: 10, y: 1, width: 6, height: 8},
                    {element: 'tree-2', x: 1, y: 12, width: 6, height: 8}
                ],
                'Three tiles free space must keep exactly three tiles between trees at x 1 and 10 and push'
                    +' the third tree to the next row at y 12'
            );
        });
    }

    async testCenteredGridHousesWithRandomTreesMatchesCommittedExpectedMap()
    {
        await this.test('mapCenteredElements houses form the center grid while trees are placed random', async () => {
            await this.runPlacementScenario(
                this.buildCenteredGridHousesConfig('element-placement-centered-grid-random-trees', 'random'),
                86420,
                'element-placement-centered-grid-random-trees-expected.json',
                [
                    {element: 'house1-0', x: 17, y: 15, width: 7, height: 9},
                    {element: 'house2-0', x: 26, y: 14, width: 7, height: 12},
                    {element: 'house2-1', x: 8, y: 14, width: 7, height: 12},
                    {element: 'tree-0', x: 19, y: 29, width: 6, height: 8},
                    {element: 'tree-1', x: 31, y: 2, width: 6, height: 8},
                    {element: 'tree-2', x: 14, y: 2, width: 6, height: 8}
                ],
                'Centered houses must form the exact center grid while the trees scatter on seeded random spots'
            );
        });
    }

    async testCenteredGridHousesWithInOrderTreesMatchesCommittedExpectedMap()
    {
        await this.test('mapCenteredElements houses keep the same center grid while trees are placed in order', async () => {
            await this.runPlacementScenario(
                this.buildCenteredGridHousesConfig('element-placement-centered-grid-in-order-trees', 'inOrder'),
                86420,
                'element-placement-centered-grid-in-order-trees-expected.json',
                [
                    {element: 'house1-0', x: 17, y: 15, width: 7, height: 9},
                    {element: 'house2-0', x: 26, y: 14, width: 7, height: 12},
                    {element: 'house2-1', x: 8, y: 14, width: 7, height: 12},
                    {element: 'tree-0', x: 2, y: 1, width: 6, height: 8},
                    {element: 'tree-1', x: 9, y: 1, width: 6, height: 8},
                    {element: 'tree-2', x: 16, y: 1, width: 6, height: 8}
                ],
                'Centered houses must keep the exact same center grid while the trees pack on the first row'
            );
        });
    }

    async testSeededRandomPlacementIsReproducible()
    {
        await this.test('random placement with randomized quantities is reproducible and matches its expected map', async () => {
            let map = await this.runPlacementScenario(
                this.buildRandomizedConfig('element-placement-random-seeded'),
                99999,
                'element-placement-random-seeded-expected.json',
                [
                    {element: 'house1-1', x: 2, y: 7, width: 7, height: 9},
                    {element: 'house2-3', x: 4, y: 19, width: 7, height: 12},
                    {element: 'tree-0', x: 20, y: 12, width: 6, height: 8},
                    {element: 'tree-2', x: 28, y: 27, width: 6, height: 8}
                ],
                'Seeded random placement must reproduce the exact shuffled instance numbers and positions'
            );
            let secondResult = await this.generateSeededResult(
                this.buildRandomizedConfig('element-placement-random-seeded'),
                99999
            );
            this.compareMapOutputs(map, secondResult.map);
        });
    }

    async testCloserToBordersPlacementMatchesCommittedExpectedMap()
    {
        await this.test('placeElementsCloserToBorders true pushes the elements to the border ring', async () => {
            await this.runPlacementScenario(
                this.buildCloserToBordersConfig('element-placement-closer-to-borders'),
                75319,
                'element-placement-closer-to-borders-expected.json',
                [
                    {element: 'house1-0', x: 1, y: 1, width: 7, height: 9},
                    {element: 'house2-0', x: 30, y: 1, width: 7, height: 12},
                    {element: 'tree-0', x: 1, y: 12, width: 6, height: 8},
                    {element: 'tree-1', x: 31, y: 15, width: 6, height: 8}
                ],
                'Placing closer to borders must push the houses and trees onto the border ring positions'
            );
        });
    }

    async testMinimumDistanceFromBordersKeepsElementsAwayFromBorders()
    {
        await this.test('minimumDistanceFromBorders four keeps the elements away from the borders', async () => {
            await this.runPlacementScenario(
                this.buildMinimumDistanceConfig('element-placement-minimum-distance'),
                95173,
                'element-placement-minimum-distance-expected.json',
                [
                    {element: 'house1-0', x: 4, y: 4, width: 7, height: 9},
                    {element: 'tree-0', x: 12, y: 4, width: 6, height: 8}
                ],
                'A minimum distance of four must start the scan placement at position four by four'
            );
        });
    }

    async testOrderBySizeKeepsInputOrderOnAreaTie()
    {
        await this.test('orderElementsBySize keeps the input order when the areas tie (tree and oak, both 6x8)', async () => {
            let config = this.buildOakTieConfig('element-placement-area-tie');
            let result = await this.runExpectedMapScenario(
                config,
                24680,
                'element-placement-area-tie-expected.json'
            );
            let bounds = this.collectElementBounds(result.map, config);
            Logger.log(100, '', 'Bounds area-tie: '+sc.toJsonString(bounds));
        });
    }

}

module.exports.TestElementPlacementConfiguration = TestElementPlacementConfiguration;
