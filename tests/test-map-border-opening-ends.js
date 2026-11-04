/**
 *
 * Reldens - Test Map Border Opening Ends
 *
 * The tiles that close the border on both sides of an entry position opening. A mid run end takes the border
 * inner corners rotated 180 degrees, so a bottom opening takes the top pair and a top opening takes the bottom
 * pair, and both flip left with right. An end landing on a map corner column keeps the border own family
 * instead, because there the line has to close into the map corner rather than turn inwards. Without inner
 * corners the border corner tiles cover the ends with the side flipped only.
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapBorderGenerator } = require('../lib/generator/map-border-generator');
const { EntryPositionStubBuilder } = require('./entry-position-stub-builder');

class TestMapBorderOpeningEnds extends BaseMapGeneratorTest
{

    buildBorderGenerator(borderInnerCornersTiles, bordersTiles)
    {
        return new MapBorderGenerator({
            borderInnerCornersTiles: borderInnerCornersTiles,
            bordersTiles: bordersTiles
        });
    }

    async testBottomOpeningTakesTheTopInnerCornersFlipped()
    {
        await this.test('a bottom opening takes the top inner corners with the sides flipped', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14},
                {}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left'), 12);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'right'), 11);
        });
    }

    async testTopOpeningTakesTheBottomInnerCornersFlipped()
    {
        await this.test('a top opening takes the bottom inner corners with the sides flipped', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14},
                {}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'left'), 14);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'right'), 13);
        });
    }

    async testACornerColumnEndKeepsTheBorderOwnFamily()
    {
        await this.test('an end landing on a corner column keeps the border own family', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14},
                {}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left', true), 14);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'right', true), 13);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'left', true), 12);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'right', true), 11);
        });
    }

    async testInnerCornersWinOverTheBorderCorners()
    {
        await this.test('the inner corners are used even when the border corners are set', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14},
                {'top-left': 1, 'top-right': 2, 'bottom-left': 3, 'bottom-right': 4}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left'), 12);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'right'), 13);
        });
    }

    async testOpeningEndsFallBackToTheBorderCornersWithTheSideFlipped()
    {
        await this.test('without inner corners the border corners cover the ends with the side flipped', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {},
                {'top-left': 1, 'top-right': 2, 'bottom-left': 3, 'bottom-right': 4}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left'), 4);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'right'), 3);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'left'), 2);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'right'), 1);
        });
    }

    async testOpeningEndsStayEmptyWithoutAnyCorners()
    {
        await this.test('with neither inner nor border corners the opening ends stay empty', async () => {
            let borderGenerator = this.buildBorderGenerator({}, {});
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left'), 0);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(true, 'right'), 0);
        });
    }

    async testPartialInnerCornersFallBackOnlyForTheMissingSide()
    {
        await this.test('a missing inner corner falls back to the border corner for that side', async () => {
            let borderGenerator = this.buildBorderGenerator(
                {'top-right': 12},
                {'top-left': 1, 'top-right': 2, 'bottom-left': 3, 'bottom-right': 4}
            );
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'left'), 12);
            this.assertEqual(borderGenerator.fetchOpeningEndTile(false, 'right'), 3);
        });
    }

    async testAnOpeningAgainstTheRightCornerClosesOnTheCornerColumn()
    {
        await this.test('an opening against the right corner closes the line on the corner column', async () => {
            let generator = EntryPositionStubBuilder.build({
                entryPosition: 'down-right',
                borderInnerCornersTiles: {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14}
            });
            new MapBorderGenerator(generator).createEntryPosition();
            let bottomRowStart = (generator.mapHeight - 1) * generator.mapWidth;
            this.assertEqual(generator.borderLayer[bottomRowStart + 7], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[bottomRowStart + 8], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[bottomRowStart + 6], 12, 'the inner end keeps the rotated corner');
            this.assertEqual(generator.borderLayer[bottomRowStart + 9], 13, 'the corner column closes the line');
        });
    }

    async testAnOpeningAgainstTheLeftCornerClosesOnTheCornerColumn()
    {
        await this.test('an opening against the left corner closes the line on the corner column', async () => {
            let generator = EntryPositionStubBuilder.build({
                entryPosition: 'down-left',
                borderInnerCornersTiles: {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14}
            });
            new MapBorderGenerator(generator).createEntryPosition();
            let bottomRowStart = (generator.mapHeight - 1) * generator.mapWidth;
            this.assertEqual(generator.borderLayer[bottomRowStart + 1], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[bottomRowStart + 2], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[bottomRowStart], 14, 'the corner column closes the line');
            this.assertEqual(generator.borderLayer[bottomRowStart + 3], 11, 'the inner end keeps the rotated corner');
        });
    }

    async testATopOpeningAgainstACornerClosesOnTheCornerColumn()
    {
        await this.test('a top opening against a corner closes the line on the corner column', async () => {
            let generator = EntryPositionStubBuilder.build({
                entryPosition: 'top-right',
                borderInnerCornersTiles: {'top-left': 11, 'top-right': 12, 'bottom-left': 13, 'bottom-right': 14}
            });
            new MapBorderGenerator(generator).createEntryPosition();
            this.assertEqual(generator.borderLayer[7], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[8], 0, 'the opening is cut');
            this.assertEqual(generator.borderLayer[6], 14, 'the inner end keeps the rotated corner');
            this.assertEqual(generator.borderLayer[9], 11, 'the corner column closes the line');
        });
    }

    async testTheEntryIsCutAgainstTheFinalMapSize()
    {
        await this.test('the entry is cut against the final map size, after any auto grow', async () => {
            let generator = EntryPositionStubBuilder.build({
                mapName: 'house-001',
                entryPosition: 'down-middle',
                entryPositionFrom: 'town-001',
                borderLayer: Array(80).fill(1)
            });
            generator.mapHeight = generator.mapHeight + 4;
            generator.borderLayer = Array(generator.mapWidth * generator.mapHeight).fill(1);
            generator.mapGrid = Array.from(
                {length: generator.mapHeight},
                () => Array(generator.mapWidth).fill(true)
            );
            new MapBorderGenerator(generator).createEntryPosition();
            let finalRowStart = (generator.mapHeight - 1) * generator.mapWidth;
            this.assertEqual(generator.borderLayer[finalRowStart + 4], 0, 'the gap is cut on the final bottom row');
            let changePointsLayer = generator.additionalLayers[0];
            this.assert(
                0 !== changePointsLayer.data[finalRowStart + 4],
                'the change point is recorded on the final bottom row, never on a pre grow row'
            );
        });
    }

}

module.exports.TestMapBorderOpeningEnds = TestMapBorderOpeningEnds;
