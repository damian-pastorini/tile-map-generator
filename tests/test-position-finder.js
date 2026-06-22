/**
 *
 * Reldens - Test Position Finder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PositionFinder } = require('../lib/generator/position-finder');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestPositionFinder extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            placeElementsOrder: 'inOrder',
            placeElementsCloserToBorders: false,
            minimumDistanceFromBorders: 0,
            geometryCalculator: new GeometryCalculator()
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    buildOpenGrid(width, height)
    {
        return Array.from({length: height}, () => Array(width).fill(true));
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            this.assert(finder instanceof PositionFinder, 'Expected PositionFinder instance');
            this.assert('function' === typeof finder.findPosition, 'Expected findPosition method');
            this.assert('function' === typeof finder.canPlaceElement, 'Expected canPlaceElement method');
        });
    }

    async testCanPlaceElementWalkable()
    {
        await this.test('canPlaceElement true on fully walkable footprint', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = this.buildOpenGrid(5, 5);
            this.assertEqual(finder.canPlaceElement(0, 0, 2, 2, 5, 5, mapGrid), true);
        });
    }

    async testCanPlaceElementBlocked()
    {
        await this.test('canPlaceElement false when footprint has blocked cell', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = this.buildOpenGrid(5, 5);
            mapGrid[1][1] = false;
            this.assertEqual(finder.canPlaceElement(0, 0, 2, 2, 5, 5, mapGrid), false);
        });
    }

    async testCanPlaceElementMinimumDistanceFromBorders()
    {
        await this.test('canPlaceElement respects minimumDistanceFromBorders', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({minimumDistanceFromBorders: 2}));
            let mapGrid = this.buildOpenGrid(8, 8);
            this.assertEqual(finder.canPlaceElement(0, 0, 1, 1, 8, 8, mapGrid), false);
            this.assertEqual(finder.canPlaceElement(2, 2, 1, 1, 8, 8, mapGrid), true);
        });
    }

    async testFindNextAvailablePosition()
    {
        await this.test('findNextAvailablePosition returns first scan-order fit', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = this.buildOpenGrid(4, 4);
            let position = finder.findNextAvailablePosition(2, 2, 4, 4, mapGrid);
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

    async testFindNextAvailablePositionNoFit()
    {
        await this.test('findNextAvailablePosition returns null when nothing fits', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = this.buildOpenGrid(2, 2);
            mapGrid[0][0] = false;
            mapGrid[0][1] = false;
            mapGrid[1][0] = false;
            mapGrid[1][1] = false;
            let position = finder.findNextAvailablePosition(1, 1, 2, 2, mapGrid);
            this.assertEqual(position, null);
        });
    }

    async testFindPositionUnknownOrderReturnsNull()
    {
        await this.test('findPosition returns null for unknown order', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({placeElementsOrder: 'unknown'}));
            let mapGrid = this.buildOpenGrid(4, 4);
            this.assertEqual(finder.findPosition(1, 1, 4, 4, mapGrid), null);
        });
    }

    async testTryEdgePositions()
    {
        await this.test('tryEdgePositions returns a valid corner', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = this.buildOpenGrid(6, 6);
            let position = finder.tryEdgePositions(2, 2, 6, 6, mapGrid);
            this.assert(null !== position, 'Expected a corner position');
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

}

module.exports.TestPositionFinder = TestPositionFinder;
