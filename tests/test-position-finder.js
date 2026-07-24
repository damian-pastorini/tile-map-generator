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
        if(!overrides){
            return generator;
        }
        return Object.assign(generator, overrides);
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
            let mapGrid = Array.from({length: 5}, () => Array(5).fill(true));
            this.assertEqual(finder.canPlaceElement(0, 0, 2, 2, 5, 5, mapGrid), true);
        });
    }

    async testCanPlaceElementBlocked()
    {
        await this.test('canPlaceElement false when footprint has blocked cell', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 5}, () => Array(5).fill(true));
            mapGrid[1][1] = false;
            this.assertEqual(finder.canPlaceElement(0, 0, 2, 2, 5, 5, mapGrid), false);
        });
    }

    async testCanPlaceElementMinimumDistanceFromBorders()
    {
        await this.test('canPlaceElement respects minimumDistanceFromBorders', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({minimumDistanceFromBorders: 2}));
            let mapGrid = Array.from({length: 8}, () => Array(8).fill(true));
            this.assertEqual(finder.canPlaceElement(0, 0, 1, 1, 8, 8, mapGrid), false);
            this.assertEqual(finder.canPlaceElement(2, 2, 1, 1, 8, 8, mapGrid), true);
        });
    }

    async testFindNextAvailablePosition()
    {
        await this.test('findNextAvailablePosition returns first scan-order fit', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 4}, () => Array(4).fill(true));
            let position = finder.findNextAvailablePosition(2, 2, 4, 4, mapGrid);
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

    async testFindNextAvailablePositionNoFit()
    {
        await this.test('findNextAvailablePosition returns null when nothing fits', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 2}, () => Array(2).fill(true));
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
            let mapGrid = Array.from({length: 4}, () => Array(4).fill(true));
            this.assertEqual(finder.findPosition(1, 1, 4, 4, mapGrid), null);
        });
    }

    async testTryEdgePositions()
    {
        await this.test('tryEdgePositions returns a valid corner', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            let position = finder.tryEdgePositions(2, 2, 6, 6, mapGrid);
            this.assert(null !== position, 'Expected a corner position');
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

    async testTryDistributedBorderPositions()
    {
        await this.test('tryDistributedBorderPositions returns first valid border slot', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            let position = finder.tryDistributedBorderPositions(2, 2, 6, 6, mapGrid);
            this.assert(null !== position, 'Expected a border position');
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

    async testTryGridPositions()
    {
        await this.test('tryGridPositions returns a placeable position', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            let position = finder.tryGridPositions(2, 2, 36, 6, 6, mapGrid);
            this.assert(null !== position, 'Expected a grid position');
            this.assertEqual(finder.canPlaceElement(position.x, position.y, 2, 2, 6, 6, mapGrid), true);
        });
    }

    async testFindRandomPositionCloserToBorders()
    {
        await this.test('findRandomPositionCloserToBorders picks a corner on an open map', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({placeElementsCloserToBorders: true}));
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            let position = finder.findRandomPositionCloserToBorders(2, 2, 6, 6, mapGrid);
            this.assertEqual(position.x, 0);
            this.assertEqual(position.y, 0);
        });
    }

    async testTryRandomPositions()
    {
        await this.test('tryRandomPositions returns hit within bounds and null when never satisfied', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub());
            Math.random = this.seedRandom(12345);
            try {
                let hit = finder.tryRandomPositions(50, 5, 5, (x, y) => 0 <= x && 0 <= y);
                this.assert(null !== hit, 'Expected a random hit');
                this.assert(hit.x < 5 && hit.y < 5, 'Hit must be within bounds');
                let miss = finder.tryRandomPositions(20, 5, 5, () => false);
                this.assertEqual(miss, null);
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testFindRandomPositionOnAnywhere()
    {
        await this.test('findRandomPositionOnAnywhere returns a placeable position on open map', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({placeElementsOrder: 'random'}));
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            Math.random = this.seedRandom(777);
            try {
                let position = finder.findRandomPositionOnAnywhere(1, 1, 6, 6, mapGrid);
                this.assert(null !== position, 'Expected a random position');
                this.assertEqual(finder.canPlaceElement(position.x, position.y, 1, 1, 6, 6, mapGrid), true);
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testFindPositionRandomOrder()
    {
        await this.test('findPosition routes to random placement for random order', async () => {
            let finder = new PositionFinder(this.buildGeneratorStub({placeElementsOrder: 'random'}));
            let mapGrid = Array.from({length: 6}, () => Array(6).fill(true));
            Math.random = this.seedRandom(2024);
            try {
                let position = finder.findPosition(1, 1, 6, 6, mapGrid);
                this.assert(null !== position, 'Expected a position for random order');
                this.assert(position.x >= 0 && position.y >= 0, 'Position must be valid');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

}

module.exports.TestPositionFinder = TestPositionFinder;
