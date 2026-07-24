/**
 *
 * Reldens - Test Element Mover
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementMover } = require('../lib/map/element-mover');

class TestElementMover extends BaseMapGeneratorTest
{

    buildMultiLayerMap()
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('tree-001-below-player', ElementFixtures.gridWithTileAt(1, 1, 100)),
            ElementFixtures.buildLayer('tree-001-collisions', ElementFixtures.gridWithTileAt(1, 1, 200))
        ]);
    }

    buildMultiLayerElements()
    {
        return {
            elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                {col: 1, row: 1, width: 1, height: 1},
                [
                    ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [{col: 1, row: 1, gid: 100}]),
                    ElementFixtures.buildElementLayer('tree-001-collisions', 'collisions', [{col: 1, row: 1, gid: 200}])
                ]
            )]
        };
    }

    async testValidMove()
    {
        await this.test('Valid move translates tiles and updates bounds', async () => {
            let mapJson = ElementFixtures.buildSingleTileTreeMap();
            let mapElements = ElementFixtures.buildSingleTileTreeElements();
            let result = new ElementMover().move(mapJson, mapElements, 'tree-001', 1, 1);
            this.assert(result.success, 'Expected move success');
            this.assertEqual(mapJson.layers[0].data[5], 0, 'Old position should be zero');
            this.assertEqual(mapJson.layers[0].data[10], 100, 'New position should have gid');
            this.assertEqual(mapElements.elements[0].bounds.col, 2);
            this.assertEqual(mapElements.elements[0].bounds.row, 2);
            this.assertEqual(mapElements.elements[0].layers[0].tiles[0].col, 2);
            this.assertEqual(mapElements.elements[0].layers[0].tiles[0].row, 2);
        });
    }

    async testMoveOutOfBoundsLeft()
    {
        await this.test('Move out of bounds (left) rejected', async () => {
            let mapJson = ElementFixtures.buildSingleTileTreeMap();
            let result = new ElementMover().move(mapJson, ElementFixtures.buildSingleTileTreeElements(), 'tree-001', -2, 0);
            this.assert(!result.success);
            this.assertEqual(result.error, 'outOfBounds');
            this.assertEqual(mapJson.layers[0].data[5], 100, 'Position should remain unchanged');
        });
    }

    async testMoveOutOfBoundsRight()
    {
        await this.test('Move out of bounds (right) rejected', async () => {
            let result = new ElementMover().move(
                ElementFixtures.buildSingleTileTreeMap(),
                ElementFixtures.buildSingleTileTreeElements(),
                'tree-001', 5, 0
            );
            this.assert(!result.success);
            this.assertEqual(result.error, 'outOfBounds');
        });
    }

    async testMoveNonExistentElement()
    {
        await this.test('Move non-existent element returns elementNotFound', async () => {
            let result = new ElementMover().move(
                ElementFixtures.buildSingleTileTreeMap(),
                ElementFixtures.buildSingleTileTreeElements(),
                'no-such', 1, 1
            );
            this.assert(!result.success);
            this.assertEqual(result.error, 'elementNotFound');
        });
    }

    async testMoveOutOfBoundsTop()
    {
        await this.test('Move out of bounds (top) rejected', async () => {
            let mapJson = ElementFixtures.buildSingleTileTreeMap();
            let result = new ElementMover().move(mapJson, ElementFixtures.buildSingleTileTreeElements(), 'tree-001', 0, -2);
            this.assert(!result.success);
            this.assertEqual(result.error, 'outOfBounds');
            this.assertEqual(mapJson.layers[0].data[5], 100, 'Position should remain unchanged');
        });
    }

    async testMoveOutOfBoundsBottom()
    {
        await this.test('Move out of bounds (bottom) rejected', async () => {
            let result = new ElementMover().move(
                ElementFixtures.buildSingleTileTreeMap(),
                ElementFixtures.buildSingleTileTreeElements(),
                'tree-001', 0, 5
            );
            this.assert(!result.success);
            this.assertEqual(result.error, 'outOfBounds');
        });
    }

    async testMoveSkipsLayerMissingFromMap()
    {
        await this.test('Move succeeds and updates bounds when an element layer is not present in the map', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', ElementFixtures.gridWithTileAt(0, 0, 1))
            ]);
            let mapElements = {
                elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                    {col: 1, row: 1, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree-001-ghost', 'below-player', [{col: 1, row: 1, gid: 100}])]
                )]
            };
            let result = new ElementMover().move(mapJson, mapElements, 'tree-001', 1, 1);
            this.assert(result.success, 'Move should succeed even when the layer is missing from the map');
            this.assertEqual(mapElements.elements[0].bounds.col, 2, 'Bounds col should still advance');
            this.assertEqual(mapElements.elements[0].bounds.row, 2, 'Bounds row should still advance');
            this.assertDeepEqual(mapJson.layers[0].data, ElementFixtures.gridWithTileAt(0, 0, 1), 'Unrelated map layer is untouched');
        });
    }

    async testMoveMultiLayerElement()
    {
        await this.test('Multi-layer element translated together', async () => {
            let mapJson = this.buildMultiLayerMap();
            let result = new ElementMover().move(mapJson, this.buildMultiLayerElements(), 'tree-001', 1, 1);
            this.assert(result.success);
            this.assertEqual(mapJson.layers[0].data[10], 100);
            this.assertEqual(mapJson.layers[1].data[10], 200);
            this.assertEqual(mapJson.layers[0].data[5], 0);
            this.assertEqual(mapJson.layers[1].data[5], 0);
        });
    }
}

module.exports.TestElementMover = TestElementMover;
