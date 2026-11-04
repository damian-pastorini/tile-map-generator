/**
 *
 * Reldens - Test Main Path Mirror
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MainPathMirror } = require('../lib/generator/main-path-mirror');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { MainPathEdgesConstants } = require('../lib/constants');

class TestMainPathMirror extends BaseMapGeneratorTest
{

    buildPathIndexes(points, mapWidth)
    {
        return points.map(point => ({index: point.y * mapWidth + point.x, x: point.x, y: point.y}));
    }

    assertMirror(previousPoints, expectedPoints, expectedBorderPoints, message)
    {
        let mirror = new MainPathMirror(new LayerDataFactory());
        let result = mirror.generateOppositeMainPath(
            this.buildPathIndexes(previousPoints, 10),
            {mapWidth: 10, mapHeight: 10},
            10,
            10,
            false
        );
        this.assertDeepEqual(
            result.generatedMainPathIndexes,
            this.buildPathIndexes(expectedPoints, 10),
            message+' - inner path'
        );
        this.assertDeepEqual(
            result.generatedMainPathIndexesBorder,
            this.buildPathIndexes(expectedBorderPoints, 10),
            message+' - border cells'
        );
    }

    async testMirrorsABorderColumnPathWhenTheBorderIsWalkable()
    {
        await this.test('generateOppositeMainPath flips a walkable border column path horizontally', async () => {
            let mirror = new MainPathMirror(new LayerDataFactory());
            let previous = [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}];
            let result = mirror.generateOppositeMainPath(previous, {}, 5, 5, true);
            this.assert(result.hasAssociatedMap, 'Opposite path marks associated map');
            this.assertDeepEqual(
                result.generatedMainPathIndexes,
                [{index: 4, x: 4, y: 0}, {index: 9, x: 4, y: 1}, {index: 14, x: 4, y: 2}],
                'The left border column path must land on the right border column'
            );
            this.assertDeepEqual(result.generatedMainPathIndexesBorder, [], 'No border cells when the border walks');
        });
    }

    async testMirrorsTopInnerRowToBottom()
    {
        await this.test('a top inner row path is mirrored onto the bottom inner row', async () => {
            this.assertMirror(
                [{x: 3, y: 1}, {x: 4, y: 1}, {x: 5, y: 1}],
                [{x: 3, y: 8}, {x: 4, y: 8}, {x: 5, y: 8}],
                [{x: 3, y: 9}, {x: 4, y: 9}, {x: 5, y: 9}],
                'Top to bottom'
            );
        });
    }

    async testMirrorsBottomInnerRowToTop()
    {
        await this.test('a bottom inner row path is mirrored onto the top inner row', async () => {
            this.assertMirror(
                [{x: 3, y: 8}, {x: 4, y: 8}, {x: 5, y: 8}],
                [{x: 3, y: 1}, {x: 4, y: 1}, {x: 5, y: 1}],
                [{x: 3, y: 0}, {x: 4, y: 0}, {x: 5, y: 0}],
                'Bottom to top'
            );
        });
    }

    async testMirrorsLeftInnerColumnToRight()
    {
        await this.test('a left inner column path is mirrored onto the right inner column', async () => {
            this.assertMirror(
                [{x: 1, y: 3}, {x: 1, y: 4}, {x: 1, y: 5}],
                [{x: 8, y: 3}, {x: 8, y: 4}, {x: 8, y: 5}],
                [{x: 9, y: 3}, {x: 9, y: 4}, {x: 9, y: 5}],
                'Left to right'
            );
        });
    }

    async testMirrorsRightInnerColumnToLeft()
    {
        await this.test('a right inner column path is mirrored onto the left inner column', async () => {
            this.assertMirror(
                [{x: 8, y: 3}, {x: 8, y: 4}, {x: 8, y: 5}],
                [{x: 1, y: 3}, {x: 1, y: 4}, {x: 1, y: 5}],
                [{x: 0, y: 3}, {x: 0, y: 4}, {x: 0, y: 5}],
                'Right to left'
            );
        });
    }

    async testMirrorsIntoASmallerMap()
    {
        await this.test('a path from a bigger map is fitted inside the smaller current map edge', async () => {
            let mirror = new MainPathMirror(new LayerDataFactory());
            let result = mirror.generateOppositeMainPath(
                this.buildPathIndexes([{x: 18, y: 15}, {x: 18, y: 16}, {x: 18, y: 17}], 20),
                {mapWidth: 20, mapHeight: 20},
                10,
                12,
                false
            );
            this.assertDeepEqual(
                result.generatedMainPathIndexes,
                this.buildPathIndexes([{x: 1, y: 8}, {x: 1, y: 9}, {x: 1, y: 10}], 10),
                'The right edge path must land on the left inner column and be shifted inside the map height'
            );
            this.assertDeepEqual(
                result.generatedMainPathIndexesBorder,
                this.buildPathIndexes([{x: 0, y: 8}, {x: 0, y: 9}, {x: 0, y: 10}], 10),
                'The border cells must follow the shifted path'
            );
        });
    }

    async testMirrorUsesThePreviousMapSizeToResolveTheEdge()
    {
        await this.test('the previous path edge is resolved against the previous map size', async () => {
            let mirror = new MainPathMirror(new LayerDataFactory());
            let result = mirror.generateOppositeMainPath(
                this.buildPathIndexes([{x: 3, y: 8}, {x: 4, y: 8}, {x: 5, y: 8}], 10),
                {mapWidth: 10, mapHeight: 10},
                20,
                20,
                false
            );
            this.assertDeepEqual(
                result.generatedMainPathIndexes,
                this.buildPathIndexes([{x: 3, y: 1}, {x: 4, y: 1}, {x: 5, y: 1}], 20),
                'A bottom path of a 10x10 map must land on the top of the 20x20 map'
            );
        });
    }

    async testMirrorsASingleTilePath()
    {
        await this.test('a single tile path is mirrored from its closest edge', async () => {
            let mirror = new MainPathMirror(new LayerDataFactory());
            let result = mirror.generateOppositeMainPath([{index: 40, x: 0, y: 4}], {}, 10, 10, true);
            this.assertDeepEqual(
                result.generatedMainPathIndexes,
                [{index: 49, x: 9, y: 4}],
                'A single tile on the left border must land on the right border'
            );
        });
    }

    async testResolvePathEdge()
    {
        await this.test('resolvePathEdge returns the edge the path runs along', async () => {
            let mirror = new MainPathMirror(new LayerDataFactory());
            let edges = [
                mirror.resolvePathEdge(this.buildPathIndexes([{x: 3, y: 1}, {x: 4, y: 1}], 10), 10, 10),
                mirror.resolvePathEdge(this.buildPathIndexes([{x: 8, y: 3}, {x: 8, y: 4}], 10), 10, 10),
                mirror.resolvePathEdge(this.buildPathIndexes([{x: 3, y: 8}, {x: 4, y: 8}], 10), 10, 10),
                mirror.resolvePathEdge(this.buildPathIndexes([{x: 1, y: 1}, {x: 1, y: 2}], 10), 10, 10),
                mirror.resolvePathEdge([], 10, 10)
            ];
            this.assertDeepEqual(
                edges,
                [
                    MainPathEdgesConstants.TOP,
                    MainPathEdgesConstants.RIGHT,
                    MainPathEdgesConstants.BOTTOM,
                    MainPathEdgesConstants.LEFT,
                    false
                ],
                'Each path must resolve to its edge, a vertical path next to a corner stays on its side'
            );
        });
    }

}

module.exports.TestMainPathMirror = TestMainPathMirror;
