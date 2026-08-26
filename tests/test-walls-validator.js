/**
 *
 * Reldens - Test Walls Validator
 *
 * These cases cover the guard paths and the tiles resolution of the walls validation. The proof that the
 * validation actually holds on generated output lives in test-dungeon-generation-expected-maps.js, which runs
 * every wall validation against the real dungeon map built from the committed composite files.
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsValidator } = require('../lib/validator/walls-validator');
const { WallCornersValidator } = require('../lib/validator/wall-corners-validator');
const { TerrainsValidator } = require('../lib/validator/terrains-validator');

class TestWallsValidator extends BaseMapGeneratorTest
{

    buildMap(layers, wangsets)
    {
        return {
            width: 4,
            height: 4,
            layers,
            tilesets: [{firstgid: 1, tilecount: 400, wangsets: wangsets ? wangsets : []}]
        };
    }

    buildTilesLayerData(tiles)
    {
        let layerData = new Array(16).fill(0);
        for(let tileIndex = 0; tileIndex < tiles.length; tileIndex++){
            layerData[tileIndex] = tiles[tileIndex];
        }
        return layerData;
    }

    async testNoSurroundingTilesPasses()
    {
        await this.test('No surrounding tiles passes inner wall placement', async () => {
            let validator = new WallsValidator();
            let result = validator.validateInnerWallPlacement(this.buildMap([]), {surroundingTiles: {}});
            this.assert(true === result.isValid, 'No surrounding tiles should pass');
            this.assertEqual(result.reason, 'No surrounding tiles configured', 'Expected no surrounding tiles reason');
        });
    }

    async testInnerWallsLayerMissingFails()
    {
        await this.test('Missing inner-walls layer fails inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([{name: 'cave-s00-borders', type: 'tilelayer', data: new Array(16).fill(0)}]);
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {'0,1': 129}});
            this.assert(false === result.isValid, 'Missing inner-walls layer should fail');
            this.assertEqual(result.reason, 'Inner walls layer not found', 'Expected missing layer reason');
        });
    }

    async testBordersLayerMissingFails()
    {
        await this.test('Missing borders layer fails inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([{name: 'cave-s00-inner-walls', type: 'tilelayer', data: new Array(16).fill(0)}]);
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {'0,1': 129}});
            this.assert(false === result.isValid, 'Missing borders layer should fail');
            this.assertEqual(
                result.reason,
                'Spot borders layer not found for inner walls validation',
                'Expected missing borders reason'
            );
        });
    }

    async testFindBordersLayerSkipsWallsLayers()
    {
        await this.test('the borders lookup never returns a walls layer that contains the borders name', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([
                {name: 'path-borders-inner-walls', type: 'tilelayer', data: new Array(16).fill(0)},
                {name: 'path-borders-outer-walls', type: 'tilelayer', data: new Array(16).fill(0)},
                {name: 'cave-s00-borders', type: 'tilelayer', data: new Array(16).fill(0)}
            ]);
            this.assertEqual(
                validator.findBordersLayer(map).name,
                'cave-s00-borders',
                'The walls layers must not be mistaken for the borders layer'
            );
        });
    }

    async testWallTileTypesUsesTheConfiguredInnerWallsTiles()
    {
        await this.test('the walls layer is validated against the inner walls tiles', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([
                {name: 'cave-s00-inner-walls', type: 'tilelayer', data: this.buildTilesLayerData([100, 101])}
            ]);
            let result = validator.validateWallTileTypes(map, {innerWallsTiles: {'0,0': 100, '0,1': 101}});
            this.assert(true === result.isValid, 'Inner walls tiles should pass');
            this.assertEqual(result.correctTileTypes, 2, 'Two correct wall tiles expected');
        });
    }

    async testWallTileTypesFlagsGroundTilesInsideTheWallsLayer()
    {
        await this.test('a ground ring tile found inside the inner walls layer is a violation', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([
                {name: 'cave-s00-inner-walls', type: 'tilelayer', data: this.buildTilesLayerData([100, 124])}
            ]);
            let result = validator.validateWallTileTypes(map, {
                surroundingTiles: {'-1,0': 124},
                innerWallsTiles: {'0,0': 100, '0,1': 101}
            });
            this.assert(false === result.isValid, 'A ground tile inside the walls layer must fail');
            this.assertEqual(result.incorrectTileTypes, 1, 'One incorrect wall tile expected');
        });
    }

    async testMapTerrainsWinOverTheConfiguredTiles()
    {
        await this.test('the tiles are resolved from the map terrains before the configuration', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap(
                [{name: 'cave-s00-inner-walls', type: 'tilelayer', data: this.buildTilesLayerData([6])}],
                [{name: 'cave-inner-walls', wangtiles: [{tileid: 5, wangid: [0, 1, 0, 1, 0, 1, 0, 1]}]}]
            );
            let result = validator.validateWallTileTypes(map, {innerWallsTiles: {'0,0': 999}});
            this.assert(
                true === result.isValid,
                'The terrain tile 5 plus firstgid 1 must be accepted even though the config declares another tile'
            );
            this.assertEqual(result.correctTileTypes, 1, 'The terrain tile must be counted as correct');
        });
    }

    async testPopulatedOuterWallsLayerPasses()
    {
        await this.test('a populated outer walls layer passes and its tiles are counted', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([
                {name: 'cave-s00-outer-walls', type: 'tilelayer', data: this.buildTilesLayerData([200, 100])}
            ]);
            let result = validator.validateOuterWallPlacement(map, {outerWallsTiles: {'0,0': 200}});
            this.assert(
                true === result.isValid,
                'The borders merge and the inner walls pattern pass both move tiles into the outer walls layer, so '
                +'only an empty layer is a violation'
            );
            this.assertEqual(result.checkedOuterWalls, 2, 'Both tiles must be counted');
        });
    }

    async testEmptyOuterWallsLayerFails()
    {
        await this.test('an outer walls layer with no tiles is a violation', async () => {
            let validator = new WallsValidator();
            let map = this.buildMap([
                {name: 'cave-s00-outer-walls', type: 'tilelayer', data: new Array(16).fill(0)}
            ]);
            let result = validator.validateOuterWallPlacement(map, {outerWallsTiles: {'0,0': 200}});
            this.assert(false === result.isValid, 'An empty outer walls layer must fail');
            this.assertEqual(result.violations[0].issue, 'empty-outer-walls-layer', 'Expected the empty layer issue');
        });
    }

    async testTerrainNameMatching()
    {
        await this.test('the terrain name matching separates the ground ring from the walls terrains', async () => {
            let terrainsValidator = new TerrainsValidator();
            this.assertEqual(terrainsValidator.matchesTerrainName('cave', ''), true, 'The bare terrain is the ground');
            this.assertEqual(
                terrainsValidator.matchesTerrainName('cave-inner-walls', ''),
                false,
                'A walls terrain must never be taken as the ground ring'
            );
            this.assertEqual(terrainsValidator.matchesTerrainName('cave-inner-walls', '-inner-walls'), true);
            this.assertEqual(terrainsValidator.matchesTerrainName('cave-outer-walls', '-inner-walls'), false);
        });
    }

    async testCornersAreResolvedFromTheInnerWallsTerrain()
    {
        await this.test('the corner tiles come from the inner walls terrain when the map declares it', async () => {
            let cornersValidator = new WallCornersValidator();
            let map = this.buildMap(
                [],
                [{name: 'cave-inner-walls', wangtiles: [{tileid: 8, wangid: [0, 1, 0, 1, 0, 1, 0, 0]}]}]
            );
            this.assertDeepEqual(
                cornersValidator.fetchConfiguredCorners(map, {corners: {'1,1': 282}}),
                {'-1,-1': 9},
                'The top left corner must be the terrain tileid 8 plus firstgid 1'
            );
        });
    }

    async testCornersFallBackToTheConfiguredTiles()
    {
        await this.test('the corner tiles fall back to the configuration without terrains', async () => {
            let cornersValidator = new WallCornersValidator();
            this.assertDeepEqual(
                cornersValidator.fetchConfiguredCorners(this.buildMap([]), {corners: {'1,1': 282}}),
                {'1,1': 282},
                'Without terrains the configured corners must be used'
            );
        });
    }

    async testCornerValidationNoCornersPasses()
    {
        await this.test('No corners configured passes corner validation', async () => {
            let validator = new WallsValidator();
            let result = validator.wallCornersValidator.validateCornerTilePlacement(this.buildMap([]), {corners: {}});
            this.assert(true === result.isValid, 'No corners should pass');
            this.assertEqual(result.reason, 'No corner tiles configured', 'Expected no corners reason');
        });
    }

    async testCornerValidationWithoutInnerWallsLayerIsSkipped()
    {
        await this.test('corner validation is skipped when there is no inner walls layer', async () => {
            let cornersValidator = new WallCornersValidator();
            let map = this.buildMap([{name: 'cave-s00-borders', type: 'tilelayer', data: new Array(16).fill(0)}]);
            let result = cornersValidator.validateCornerTilePlacement(map, {corners: {'1,1': 282}});
            this.assert(true === result.isValid, 'Missing inner walls layer must not fail the validation');
            this.assertEqual(result.reason, 'No inner walls layer for corner validation', 'Expected the skip reason');
        });
    }

    async testCornerValidationFlagsAnUnconfiguredCornerTile()
    {
        await this.test('a tile that is not a configured corner is flagged in the inner walls layer', async () => {
            let cornersValidator = new WallCornersValidator();
            let innerWallsData = new Array(16).fill(0);
            innerWallsData[0] = 282;
            let result = cornersValidator.validateSingleCornerPlacement({index: 0}, innerWallsData, {'1,1': 999});
            this.assertEqual(result.incorrectCorners, 1, 'Unknown corner tile should be incorrect');
            this.assert(0 < result.violations.length, 'A corner violation should be recorded');
        });
    }

    async testFetchTilesValuesReadsTheMappedPositions()
    {
        await this.test('the tiles values come from the mapped surrounding and corners positions', async () => {
            let validator = new WallsValidator();
            let tilesValues = validator.fetchTilesValues({
                originalMappedData: {
                    surroundingTilesPosition: {'top-center': 10, 'middle-center': 0},
                    cornersPosition: {'top-left': 11}
                }
            });
            this.assertEqual(tilesValues.length, 2, 'The empty position must be skipped');
            this.assertEqual(-1 !== tilesValues.indexOf(10), true, 'The surrounding tile must be listed');
            this.assertEqual(-1 !== tilesValues.indexOf(11), true, 'The corner tile must be listed');
        });
    }

    async testIsConfiguredCornerTileIgnoresUnconfiguredPositions()
    {
        await this.test('isConfiguredCornerTile only matches tiles configured on a corner position', async () => {
            let cornersValidator = new WallCornersValidator();
            this.assertEqual(cornersValidator.isConfiguredCornerTile(282, {'1,1': 282}), true);
            this.assertEqual(cornersValidator.isConfiguredCornerTile(999, {'1,1': 282}), false);
            this.assertEqual(
                cornersValidator.isConfiguredCornerTile(0, {'1,1': 0}),
                false,
                'A zero tile must never count as a configured corner'
            );
            this.assertEqual(
                cornersValidator.isConfiguredCornerTile(282, {'0,1': 282}),
                false,
                'A non corner position must not be considered'
            );
        });
    }

    async testFetchTilesValuesReturnsEveryConfiguredTile()
    {
        await this.test('fetchTilesValues returns the values of a tiles by position object', async () => {
            let cornersValidator = new WallCornersValidator();
            let tilesValues = cornersValidator.fetchTilesValues({'-1,-1': 285, '1,1': 282});
            this.assertEqual(tilesValues.length, 2, 'Both configured tiles must be returned');
            this.assertEqual(-1 !== tilesValues.indexOf(285), true, 'The top left tile must be present');
            this.assertEqual(-1 !== tilesValues.indexOf(282), true, 'The bottom right tile must be present');
            this.assertEqual(cornersValidator.fetchTilesValues({}).length, 0, 'An empty object yields no tiles');
        });
    }

}

module.exports.TestWallsValidator = TestWallsValidator;
