/**
 *
 * Reldens - Test Map Border Entry Ends
 *
 * Real map cases for the tiles that close the collisions map border where an entry position opening ends. The
 * left and right entry positions place the opening against a map corner, so the closing tile lands on the corner
 * column itself and the border line has to continue into it instead of leaving the corner tile on its own. Every
 * case generates a complete map from the committed real house-composite.json, so the closing tiles are proven on
 * a generated map file that can be opened and looked at.
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { MapTileKeyFinder } = require('../map-tile-key-finder');
const { LayerUtility } = require('../../lib/map/layer-utility');

class TestMapBorderEntryEnds extends BaseFunctionalityTest
{

    fetchBorderLayer(map)
    {
        let borderLayer = LayerUtility.findLayer(map, 'collisions-map-border');
        this.assert(borderLayer, 'The border layer must exist to prove the opening ends');
        return borderLayer;
    }

    assertOpeningIsCut(borderLayer, rowStart, openingStart, entryPositionSize)
    {
        for(let i = 0; i < entryPositionSize; i++){
            this.assertEqual(
                borderLayer.data[rowStart + openingStart + i],
                0,
                'The opening must be cut on the border column '+(openingStart + i)
            );
        }
    }

    async testARightEntryClosesTheBorderOnTheCornerColumn()
    {
        let config = this.setupWallsCompositeConfig(
            'map-border-entry-corner-right',
            {entryPosition: 'down-right', entryPositionSize: 2}
        );
        let testName = 'a right entry position closes the bottom border line on the corner column';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let borderLayer = this.fetchBorderLayer(map);
            let closingTile = MapTileKeyFinder.fetchTileGidByKey(map, 'border-bottom-left');
            this.assert(closingTile, 'The real composite must provide the border bottom left tile');
            let rowStart = (map.height - 1) * map.width;
            let cornerColumn = map.width - 1;
            let openingStart = cornerColumn - config.entryPositionSize;
            this.assertOpeningIsCut(borderLayer, rowStart, openingStart, config.entryPositionSize);
            this.assertEqual(
                borderLayer.data[rowStart + cornerColumn],
                closingTile,
                'The corner column must close the border line instead of keeping the plain corner tile'
            );
            this.assert(
                0 !== borderLayer.data[rowStart + openingStart - 1],
                'The border run must keep its tile on the inner side of the opening'
            );
        });
    }

    async testALeftEntryClosesTheBorderOnTheCornerColumn()
    {
        let config = this.setupWallsCompositeConfig(
            'map-border-entry-corner-left',
            {entryPosition: 'down-left', entryPositionSize: 2}
        );
        let testName = 'a left entry position closes the bottom border line on the corner column';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let borderLayer = this.fetchBorderLayer(map);
            let closingTile = MapTileKeyFinder.fetchTileGidByKey(map, 'border-bottom-right');
            this.assert(closingTile, 'The real composite must provide the border bottom right tile');
            let rowStart = (map.height - 1) * map.width;
            this.assertOpeningIsCut(borderLayer, rowStart, 1, config.entryPositionSize);
            this.assertEqual(
                borderLayer.data[rowStart],
                closingTile,
                'The corner column must close the border line instead of keeping the plain corner tile'
            );
            this.assert(
                0 !== borderLayer.data[rowStart + 1 + config.entryPositionSize],
                'The border run must keep its tile on the inner side of the opening'
            );
        });
    }

    async testATopRightEntryClosesTheBorderOnTheCornerColumn()
    {
        let config = this.setupWallsCompositeConfig(
            'map-border-entry-corner-top-right',
            {entryPosition: 'top-right', entryPositionSize: 2}
        );
        let testName = 'a top right entry position closes the top border line on the corner column';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let borderLayer = this.fetchBorderLayer(map);
            let closingTile = MapTileKeyFinder.fetchTileGidByKey(map, 'border-top-left');
            this.assert(closingTile, 'The real composite must provide the border top left tile');
            let cornerColumn = map.width - 1;
            let openingStart = cornerColumn - config.entryPositionSize;
            this.assertOpeningIsCut(borderLayer, 0, openingStart, config.entryPositionSize);
            this.assertEqual(
                borderLayer.data[cornerColumn],
                closingTile,
                'The corner column must close the border line instead of keeping the plain corner tile'
            );
        });
    }

}

module.exports.TestMapBorderEntryEnds = TestMapBorderEntryEnds;
