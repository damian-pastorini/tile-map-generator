/**
 *
 * Reldens - Test Spot Placement
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotPlacement } = require('../lib/generator/spot-placement');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestSpotPlacement extends BaseMapGeneratorTest
{

    async testRectOverlapsAnyDetectsOverlap()
    {
        await this.test('rectOverlapsAny returns true when overlapping an occupied rect', async () => {
            let placement = new SpotPlacement(new GeometryCalculator());
            let occupied = [{x: 0, y: 0, width: 4, height: 4}];
            this.assert(placement.rectOverlapsAny(2, 2, 3, 3, occupied), 'Overlapping rect detected');
        });
    }

    async testRectOverlapsAnyNoOverlap()
    {
        await this.test('rectOverlapsAny returns false when clear of occupied rects', async () => {
            let placement = new SpotPlacement(new GeometryCalculator());
            let occupied = [{x: 0, y: 0, width: 2, height: 2}];
            this.assert(!placement.rectOverlapsAny(10, 10, 2, 2, occupied), 'No overlap reported');
        });
    }

    async testFindFreeSpotPlacementWithinBounds()
    {
        Math.random = this.seedRandom(12345);
        try {
            await this.test('findFreeSpotPlacement returns coordinates within max bounds', async () => {
                let placement = new SpotPlacement(new GeometryCalculator());
                let result = placement.findFreeSpotPlacement([], 2, 2, 8, 6);
                this.assert(result.x >= 0 && result.x < 8, 'X within max bound');
                this.assert(result.y >= 0 && result.y < 6, 'Y within max bound');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testFindFreeSpotPlacementZeroBounds()
    {
        await this.test('findFreeSpotPlacement returns origin when bounds are zero', async () => {
            let placement = new SpotPlacement(new GeometryCalculator());
            let result = placement.findFreeSpotPlacement([], 2, 2, 0, 0);
            this.assertEqual(result.x, 0, 'X defaults to zero');
            this.assertEqual(result.y, 0, 'Y defaults to zero');
        });
    }

    async testFindFreeSpotPlacementFallbackWhenFullyOccupied()
    {
        Math.random = this.seedRandom(555);
        try {
            await this.test('findFreeSpotPlacement returns a bounded fallback when every attempt overlaps', async () => {
                let placement = new SpotPlacement(new GeometryCalculator());
                let occupied = [{x: 0, y: 0, width: 100, height: 100}];
                let result = placement.findFreeSpotPlacement(occupied, 2, 2, 8, 6);
                this.assert(result.x >= 0 && result.x < 8, 'Fallback x within max bound');
                this.assert(result.y >= 0 && result.y < 6, 'Fallback y within max bound');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

}

module.exports.TestSpotPlacement = TestSpotPlacement;
