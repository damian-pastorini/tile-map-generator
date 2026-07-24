/**
 *
 * Reldens - Test Distance Calculator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { DistanceCalculator } = require('../lib/map/distance-calculator');

class TestDistanceCalculator extends BaseMapGeneratorTest
{

    async testCalculateEuclideanDistance()
    {
        let calculator = new DistanceCalculator();
        await this.test('calculateEuclideanDistance returns the straight line length', async () => {
            let distance = calculator.calculateEuclideanDistance({x: 0, y: 0}, {x: 6, y: 8});
            this.assertEqual(distance, 10, 'distance for 6-8-10 triangle should be 10');
        });
        await this.test('calculateEuclideanDistance returns zero for identical points', async () => {
            let distance = calculator.calculateEuclideanDistance({x: 3, y: 7}, {x: 3, y: 7});
            this.assertEqual(distance, 0, 'identical points have zero distance');
        });
    }

    async testCalculateBoundingBox()
    {
        let calculator = new DistanceCalculator();
        await this.test('calculateBoundingBox computes extents, size and center', async () => {
            let box = calculator.calculateBoundingBox([{x: 1, y: 2}, {x: 5, y: 2}, {x: 3, y: 6}]);
            this.assertEqual(box.minX, 1, 'minX should be 1');
            this.assertEqual(box.maxX, 5, 'maxX should be 5');
            this.assertEqual(box.minY, 2, 'minY should be 2');
            this.assertEqual(box.maxY, 6, 'maxY should be 6');
            this.assertEqual(box.width, 5, 'width is maxX - minX + 1');
            this.assertEqual(box.height, 5, 'height is maxY - minY + 1');
            this.assertDeepEqual(box.center, {x: 3, y: 4}, 'center is floored midpoint');
        });
        await this.test('calculateBoundingBox returns null for empty or invalid input', async () => {
            this.assertEqual(calculator.calculateBoundingBox([]), null, 'empty array returns null');
            this.assertEqual(calculator.calculateBoundingBox(null), null, 'null input returns null');
        });
    }

    async testCalculateFreeSpaceBoundary()
    {
        let calculator = new DistanceCalculator();
        await this.test('calculateFreeSpaceBoundary expands around the center by the radius', async () => {
            let boundary = calculator.calculateFreeSpaceBoundary({x: 5, y: 5}, 2);
            this.assertEqual(boundary.minX, 3, 'minX is center minus radius');
            this.assertEqual(boundary.maxX, 7, 'maxX is center plus radius');
            this.assertEqual(boundary.minY, 3, 'minY is center minus radius');
            this.assertEqual(boundary.maxY, 7, 'maxY is center plus radius');
            this.assertEqual(boundary.radius, 2, 'radius is preserved');
            this.assertDeepEqual(boundary.center, {x: 5, y: 5}, 'center is preserved');
        });
    }

}

module.exports.TestDistanceCalculator = TestDistanceCalculator;
