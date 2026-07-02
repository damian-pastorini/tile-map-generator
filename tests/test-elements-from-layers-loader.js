/**
 *
 * Reldens - Test Elements From Layers Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementsFromLayersLoader } = require('../lib/loader/elements-from-layers-loader');

class TestElementsFromLayersLoader extends BaseMapGeneratorTest
{

    async testLoadEmptyLayersReturnsWarning()
    {
        await this.test('Empty layers returns no-layers warning', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([]));
            this.assertEqual(result.elements.length, 0, 'Expected empty elements');
            this.assert(-1 !== result.warnings.indexOf('no-layers'), 'Expected no-layers warning');
            this.assertEqual(result.bordersLayer, 'borders', 'Default borders layer expected');
        });
    }

    async testLoadSingleElement()
    {
        await this.test('Single element layer parsed with bounds and tiles', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer(
                    'tree-001-below-player',
                    [0, 0, 0, 0, 0, 100, 101, 0, 0, 102, 103, 0, 0, 0, 0, 0]
                )
            ]));
            this.assertEqual(result.elements.length, 1, 'Expected one element');
            this.assertEqual(result.elements[0].instanceId, 'tree-001');
            this.assertEqual(result.elements[0].elementKey, 'tree');
            this.assertEqual(result.elements[0].index, 1);
            this.assertEqual(result.elements[0].layers.length, 1);
            this.assertEqual(result.elements[0].layers[0].type, 'below-player');
            this.assertEqual(result.elements[0].layers[0].tiles.length, 4);
            this.assertEqual(result.elements[0].bounds.col, 1);
            this.assertEqual(result.elements[0].bounds.row, 1);
            this.assertEqual(result.elements[0].bounds.width, 2);
            this.assertEqual(result.elements[0].bounds.height, 2);
        });
    }

    async testMultiLayerElementGrouped()
    {
        await this.test('Multi-layer element grouped under one instanceId', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer(
                    'tree-001-below-player',
                    [0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                ),
                ElementFixtures.buildLayer(
                    'tree-001-collisions',
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0, 0]
                )
            ]));
            this.assertEqual(result.elements.length, 1);
            this.assertEqual(result.elements[0].layers.length, 2);
        });
    }

    async testSkipReservedLayerNames()
    {
        await this.test('Reserved layer names skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', []),
                ElementFixtures.buildLayer('ground-variations', []),
                ElementFixtures.buildLayer('change-points', []),
                ElementFixtures.buildLayer('spot-layer-mySpot', []),
                ElementFixtures.buildLayer('borders', [])
            ]));
            this.assertEqual(result.elements.length, 0);
            this.assertEqual(result.bordersLayer, 'borders');
        });
    }

    async testLayerWithoutNumericIndexSkipped()
    {
        await this.test('Layer name without numeric segment skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('no-numeric-part', [1, 0, 0, 0])
            ]));
            this.assertEqual(result.elements.length, 0);
        });
    }

    async testMissingMapJsonReturnsWarning()
    {
        await this.test('Missing mapJson returns no-map-json warning', async () => {
            let result = new ElementsFromLayersLoader().load(null);
            this.assertEqual(result.elements.length, 0);
            this.assert(-1 !== result.warnings.indexOf('no-map-json'));
        });
    }

    async testNonTilelayerSkipped()
    {
        await this.test('Non-tilelayer types skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                {type: 'objectgroup', name: 'tree-001-below-player', objects: []}
            ]));
            this.assertEqual(result.elements.length, 0);
        });
    }

    async testNoElementsDetectedWarning()
    {
        await this.test('load warns when layers exist but no elements detected', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 1, 1, 1])
            ]));
            this.assertEqual(result.elements.length, 0, 'Expected no elements');
            this.assert(-1 !== result.warnings.indexOf('no-elements-detected'), 'Expected no-elements-detected warning');
        });
    }

    async testShouldSkipLayerBranches()
    {
        await this.test('shouldSkipLayer guards on type, empty, reserved names and prefixes', async () => {
            let loader = new ElementsFromLayersLoader();
            this.assertEqual(loader.shouldSkipLayer(null), true, 'Non-string name skipped');
            this.assertEqual(loader.shouldSkipLayer(''), true, 'Empty name skipped');
            this.assertEqual(loader.shouldSkipLayer('ground'), true, 'Reserved name skipped');
            this.assertEqual(loader.shouldSkipLayer('change-points'), true, 'Reserved change-points skipped');
            this.assertEqual(loader.shouldSkipLayer('spot-layer-mySpot'), true, 'Prefixed spot-layer skipped');
            this.assertEqual(loader.shouldSkipLayer('tree-001-below-player'), false, 'Element layer not skipped');
        });
    }

    async testBuildElementLayerComputesTilePositions()
    {
        await this.test('buildElementLayer maps non-zero gids to col/row/gid positions', async () => {
            let loader = new ElementsFromLayersLoader();
            let layer = {name: 'tree-001-below-player', data: [0, 100, 0, 0, 101, 0]};
            let built = loader.buildElementLayer(layer, 'below-player', 3);
            this.assertEqual(built.name, 'tree-001-below-player', 'Layer name preserved');
            this.assertEqual(built.type, 'below-player', 'Layer type preserved');
            this.assertEqual(built.tiles.length, 2, 'Two non-zero tiles collected');
            this.assertEqual(built.tiles[0].col, 1, 'First tile col');
            this.assertEqual(built.tiles[0].row, 0, 'First tile row');
            this.assertEqual(built.tiles[0].gid, 100, 'First tile gid');
            this.assertEqual(built.tiles[1].col, 1, 'Second tile col');
            this.assertEqual(built.tiles[1].row, 1, 'Second tile row');
            this.assertEqual(built.tiles[1].gid, 101, 'Second tile gid');
        });
    }

    async testComputeBoundsEmptyReturnsZero()
    {
        await this.test('computeBounds returns zero bounds when no tiles present', async () => {
            let loader = new ElementsFromLayersLoader();
            let bounds = loader.computeBounds([{tiles: []}]);
            this.assertEqual(bounds.col, 0, 'Zero col');
            this.assertEqual(bounds.row, 0, 'Zero row');
            this.assertEqual(bounds.width, 0, 'Zero width');
            this.assertEqual(bounds.height, 0, 'Zero height');
        });
    }

    async testComputeBoundsAcrossMultipleLayers()
    {
        await this.test('computeBounds spans tiles across layers via extendBoundsFromLayer', async () => {
            let loader = new ElementsFromLayersLoader();
            let bounds = loader.computeBounds([
                {tiles: [{col: 2, row: 3}, {col: 5, row: 3}]},
                {tiles: [{col: 1, row: 6}]}
            ]);
            this.assertEqual(bounds.col, 1, 'Min col across layers');
            this.assertEqual(bounds.row, 3, 'Min row across layers');
            this.assertEqual(bounds.width, 5, 'Width spans cols 1..5');
            this.assertEqual(bounds.height, 4, 'Height spans rows 3..6');
        });
    }
}

module.exports.TestElementsFromLayersLoader = TestElementsFromLayersLoader;
