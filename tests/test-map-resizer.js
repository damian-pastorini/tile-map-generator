/**
 *
 * Reldens - Tile Map Generator - Test Map Resizer
 *
 * Real-map proving tests. The input is the committed five-trees-unmerged.json fixture. For every resize
 * direction (each side, each corner and centered) MapResizer's output is compared, with the base
 * compareMapOutputs helper, against a per-case committed deterministic fixture. Those fixtures are produced by
 * ResizeReferenceCropper - an independent, naive sub-rectangle cropper that is NOT MapResizer - and are
 * materialized on first run then committed, so each case has its own inspectable expected map and a mis-crop by
 * MapResizer disagrees with the independent reference. The border re-stamp is proved against real
 * house-composite.json tileset gids.
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ResizeReferenceCropper } = require('./resize-reference-cropper');
const { MapResizer } = require('../lib/map/map-resizer');
const { MapBorderStamper } = require('../lib/map/map-border-stamper');
const { ElementsFromLayersLoader } = require('../lib/loader/elements-from-layers-loader');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestMapResizer extends BaseMapGeneratorTest
{

    async testEachResizeDirectionMatchesItsDeterministicFixture()
    {
        for(let resizeCase of [
            {label: 'left', anchor: 'left', removeHorizontal: 2, removeVertical: 0, box: {minX: 0, minY: 0, newWidth: 12, newHeight: 14}, golden: 'five-trees-unmerged-resized-left-2.json'},
            {label: 'right', anchor: 'right', removeHorizontal: 2, removeVertical: 0, box: {minX: 2, minY: 0, newWidth: 12, newHeight: 14}, golden: 'five-trees-unmerged-resized-right-2.json'},
            {label: 'top', anchor: 'top', removeHorizontal: 0, removeVertical: 2, box: {minX: 0, minY: 0, newWidth: 14, newHeight: 12}, golden: 'five-trees-unmerged-resized-top-2.json'},
            {label: 'bottom', anchor: 'bottom', removeHorizontal: 0, removeVertical: 2, box: {minX: 0, minY: 2, newWidth: 14, newHeight: 12}, golden: 'five-trees-unmerged-resized-bottom-2.json'},
            {label: 'top-left', anchor: 'top-left', removeHorizontal: 2, removeVertical: 2, box: {minX: 0, minY: 0, newWidth: 12, newHeight: 12}, golden: 'five-trees-unmerged-resized-top-left-2.json'},
            {label: 'top-right', anchor: 'top-right', removeHorizontal: 2, removeVertical: 2, box: {minX: 2, minY: 0, newWidth: 12, newHeight: 12}, golden: 'five-trees-unmerged-resized-top-right-2.json'},
            {label: 'bottom-left', anchor: 'bottom-left', removeHorizontal: 2, removeVertical: 2, box: {minX: 0, minY: 2, newWidth: 12, newHeight: 12}, golden: 'five-trees-unmerged-resized-bottom-left-2.json'},
            {label: 'bottom-right', anchor: 'bottom-right', removeHorizontal: 2, removeVertical: 2, box: {minX: 2, minY: 2, newWidth: 12, newHeight: 12}, golden: 'five-trees-unmerged-resized-bottom-right-2.json'},
            {label: 'center', anchor: 'center', removeHorizontal: 2, removeVertical: 2, box: {minX: 1, minY: 1, newWidth: 12, newHeight: 12}, golden: 'five-trees-unmerged-resized-center-2.json'}
        ]){
            await this.runResizeCase(resizeCase);
        }
    }

    async runResizeCase(resizeCase)
    {
        await this.test('Force resize "'+resizeCase.label+'" of the real five-trees map matches its committed deterministic fixture', async () => {
            let source = FileHandler.fetchFileJson(FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json'));
            let working = FileHandler.fetchFileJson(FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json'));
            let record = new ElementsFromLayersLoader().load(working);
            let params = {
                anchor: resizeCase.anchor,
                removeHorizontal: resizeCase.removeHorizontal,
                removeVertical: resizeCase.removeVertical,
                force: true
            };
            let result = new MapResizer().resize(working, record, params);
            this.assert(result.success, 'The force resize must succeed for '+resizeCase.label);
            let expected = this.loadOrCreateGolden(resizeCase, source);
            this.compareMapOutputs(expected, working);
            this.assertDeepEqual(working.tilesets, expected.tilesets, 'The resize must preserve the source tileset for '+resizeCase.label);
        });
    }

    loadOrCreateGolden(resizeCase, source)
    {
        let goldenPath = FileHandler.joinPaths(this.testDataFolder, resizeCase.golden);
        let existing = FileHandler.fetchFileJson(goldenPath);
        if(existing){
            return existing;
        }
        let generated = new ResizeReferenceCropper().crop(source, resizeCase.box, ['ground']);
        FileHandler.writeFile(goldenPath, sc.toJsonString(generated, null, 1));
        return generated;
    }

    async testNonForcedLeftAnchorReportsClippedRightTrees()
    {
        await this.test('A non-forced left-anchor crop of the real five-trees map reports the two right-column trees it would clip', async () => {
            let working = FileHandler.fetchFileJson(FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json'));
            let record = new ElementsFromLayersLoader().load(working);
            let result = new MapResizer().resize(working, record, {anchor: 'left', removeHorizontal: 2, removeVertical: 0});
            this.assert(!result.success, 'A clipping crop must be rejected without force');
            this.assertDeepEqual(result.offending, ['tree-2', 'tree-4'], 'The two right-column trees must be reported as offending');
            this.assertEqual(working.width, 14, 'A rejected resize must not change the map width');
            this.assertEqual(
                sc.fetchByProperty(working.layers, 'name', 'ground').data.length,
                196,
                'A rejected resize must leave the layer data untouched'
            );
        });
    }

    async testResizeRejectsInvalidDimensions()
    {
        await this.test('A removal that would collapse the real five-trees map is rejected', async () => {
            let working = FileHandler.fetchFileJson(FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json'));
            let record = new ElementsFromLayersLoader().load(working);
            let result = new MapResizer().resize(working, record, {anchor: 'left', removeHorizontal: 14, removeVertical: 0, force: true});
            this.assert(!result.success, 'A collapsing resize must fail');
            this.assertEqual(result.error, 'invalidDimensions', 'The failure must report invalidDimensions');
            this.assertEqual(working.width, 14, 'A rejected resize must not change the map width');
        });
    }

    async testBorderRestampUsesRealTilesetGids()
    {
        await this.test('MapBorderStamper redraws the real house-composite borders perimeter using the border gids read from its own tileset', async () => {
            let map = FileHandler.fetchFileJson(FileHandler.joinPaths(this.testDataFolder, 'house-composite.json'));
            let restamped = new MapBorderStamper().restamp(map, 'borders', 38, 26);
            this.assert(restamped, 'The re-stamp must run on a map that has a borders layer and border tileset keys');
            let borders = sc.fetchByProperty(map.layers, 'name', 'borders').data;
            this.assertEqual(borders.length, 38 * 26, 'The re-stamped borders data must match the new dimensions');
            this.assertEqual(borders[0], 1162, 'Top-left corner must use the border-top-left gid (tile id 1161 + 1)');
            this.assertEqual(borders[37], 1158, 'Top-right corner must use the border-top-right gid (tile id 1157 + 1)');
            this.assertEqual(borders[950], 1156, 'Bottom-left corner must use the border-bottom-left gid (tile id 1155 + 1)');
            this.assertEqual(borders[987], 1155, 'Bottom-right corner must use the border-bottom-right gid (tile id 1154 + 1)');
            this.assertEqual(borders[1], 1166, 'Top edge must use the border-top gid (tile id 1165 + 1)');
            this.assertEqual(borders[38], 1164, 'Left edge must use the border-left gid (tile id 1163 + 1)');
            this.assertEqual(borders[75], 1159, 'Right edge must use the border-right gid (tile id 1158 + 1)');
            this.assertEqual(borders[951], 1157, 'Bottom edge must use the border-bottom gid (tile id 1156 + 1)');
            this.assertEqual(borders[39], 0, 'Interior cells must stay empty');
        });
    }

}

module.exports.TestMapResizer = TestMapResizer;
