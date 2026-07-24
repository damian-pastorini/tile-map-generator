/**
 *
 * Reldens - Test Walls Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsValidator } = require('../lib/validator/walls-validator');

class TestWallsValidator extends BaseMapGeneratorTest
{

    async testNoSurroundingTilesPasses()
    {
        await this.test('No surrounding tiles passes inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {}});
            this.assert(true === result.isValid, 'No surrounding tiles should pass');
            this.assertEqual(result.reason, 'No surrounding tiles configured', 'Expected no surrounding tiles reason');
        });
    }

    async testInnerWallsLayerMissingFails()
    {
        await this.test('Missing inner-walls layer fails inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: [{name: 'borders', type: 'tilelayer', data: new Array(16).fill(0)}]};
            let config = {surroundingTiles: {'0,1': 129}};
            let result = validator.validateInnerWallPlacement(map, config);
            this.assert(false === result.isValid, 'Missing inner-walls layer should fail');
            this.assertEqual(result.reason, 'Inner walls layer not found', 'Expected missing layer reason');
        });
    }

    async testWallTileTypesValid()
    {
        await this.test('Allowed wall tiles pass wall tile types validation', async () => {
            let validator = new WallsValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: this.tilesAt([124, 129])}]
            };
            let config = {surroundingTiles: {'-1,0': 124, '0,1': 129}};
            let result = validator.validateWallTileTypes(map, config);
            this.assert(true === result.isValid, 'Allowed wall tiles should pass');
            this.assertEqual(result.correctTileTypes, 2, 'Two correct wall tiles expected');
        });
    }

    async testWallTileTypesInvalid()
    {
        await this.test('Unexpected wall tile fails wall tile types validation', async () => {
            let validator = new WallsValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: this.tilesAt([124, 999])}]
            };
            let config = {surroundingTiles: {'-1,0': 124, '0,1': 129}};
            let result = validator.validateWallTileTypes(map, config);
            this.assert(false === result.isValid, 'Unexpected wall tile should fail');
            this.assertEqual(result.incorrectTileTypes, 1, 'One incorrect wall tile expected');
        });
    }

    async testCornerValidationNoCornersPasses()
    {
        await this.test('No corners configured passes corner validation', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateCornerTilePlacement(map, {corners: {}});
            this.assert(true === result.isValid, 'No corners should pass');
            this.assertEqual(result.reason, 'No corner tiles configured', 'Expected no corners reason');
        });
    }

    async testGetPathNeighbors()
    {
        await this.test('getPathNeighbors reads surrounding tile values and nulls at edges', async () => {
            let validator = new WallsValidator();
            let data = new Array(9).fill(0);
            data[1] = 11;
            data[3] = 13;
            data[5] = 15;
            data[7] = 17;
            let neighbors = validator.getPathNeighbors(1, 1, 3, 3, data);
            this.assertEqual(neighbors['0,-1'], 11, 'Up neighbor should be tile at index 1');
            this.assertEqual(neighbors['-1,0'], 13, 'Left neighbor should be tile at index 3');
            this.assertEqual(neighbors['1,0'], 15, 'Right neighbor should be tile at index 5');
            this.assertEqual(neighbors['0,1'], 17, 'Down neighbor should be tile at index 7');
            let edgeNeighbors = validator.getPathNeighbors(0, 0, 3, 3, data);
            this.assertEqual(edgeNeighbors['-1,0'], null, 'Out-of-bounds neighbor should be null');
        });
    }

    async testValidateInnerWallsAroundBorder()
    {
        await this.test('validateInnerWallsAroundBorder counts correct and missing walls', async () => {
            let validator = new WallsValidator();
            let innerWallsData = new Array(25).fill(0);
            innerWallsData[17] = 129;
            let surroundingTiles = {'0,1': 129, '0,-1': 126};
            let result = validator.validateInnerWallsAroundBorder({x: 2, y: 2}, innerWallsData, 5, 5, surroundingTiles);
            this.assertEqual(result.correctWalls, 1, 'Below-border wall should be correct');
            this.assertEqual(result.missingWalls, 0, 'No walls should be missing inside bounds');
        });
    }

    async testValidateOuterWallsAroundInnerWall()
    {
        await this.test('validateOuterWallsAroundInnerWall accepts configured surrounding tiles', async () => {
            let validator = new WallsValidator();
            let outerWallsData = new Array(25).fill(0);
            outerWallsData[22] = 129;
            let result = validator.validateOuterWallsAroundInnerWall({x: 2, y: 3}, outerWallsData, 5, 5, {'0,1': 129});
            this.assertEqual(result.correctWalls, 1, 'Neighbor matching surrounding tile should be correct');
            this.assertEqual(result.incorrectWalls, 0, 'No incorrect outer walls expected');
        });
    }

    async testValidateOuterWallsAroundInnerWallIncorrect()
    {
        await this.test('validateOuterWallsAroundInnerWall flags unknown neighbor tiles', async () => {
            let validator = new WallsValidator();
            let outerWallsData = new Array(25).fill(0);
            outerWallsData[22] = 777;
            let result = validator.validateOuterWallsAroundInnerWall({x: 2, y: 3}, outerWallsData, 5, 5, {'0,1': 129});
            this.assertEqual(result.incorrectWalls, 1, 'Unknown neighbor tile should be incorrect');
            this.assert(0 < result.violations.length, 'A violation should be recorded');
        });
    }

    async testValidateInnerWallPlacementValid()
    {
        await this.test('Correctly placed inner walls around a border pass placement validation', async () => {
            let validator = new WallsValidator();
            let map = {width: 5, height: 5, layers: this.buildBordersAndInnerWalls()};
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {'0,1': 129}});
            this.assert(true === result.isValid, 'Correct inner wall placement should pass');
            this.assertEqual(result.correctInnerWalls, 1, 'One correct inner wall expected');
        });
    }

    async testValidateInnerWallPlacementMissingBordersFails()
    {
        await this.test('Missing borders source layer fails inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = {
                width: 5,
                height: 5,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: new Array(25).fill(0)}]
            };
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {'0,1': 129}});
            this.assert(false === result.isValid, 'Missing borders layer should fail');
            this.assertEqual(
                result.reason,
                'Spot borders layer not found for inner walls validation',
                'Expected missing borders reason'
            );
        });
    }

    async testValidateOuterWallPlacementValid()
    {
        await this.test('Correctly placed outer walls around inner walls pass placement validation', async () => {
            let validator = new WallsValidator();
            let innerWalls = new Array(25).fill(0);
            innerWalls[12] = 129;
            let outerWalls = new Array(25).fill(0);
            outerWalls[17] = 129;
            let map = {
                width: 5,
                height: 5,
                layers: [
                    {name: 'inner-walls', type: 'tilelayer', data: innerWalls},
                    {name: 'outer-walls', type: 'tilelayer', data: outerWalls}
                ]
            };
            let result = validator.validateOuterWallPlacement(map, {surroundingTiles: {'0,1': 129}});
            this.assert(true === result.isValid, 'Correct outer wall placement should pass');
            this.assertEqual(result.correctOuterWalls, 1, 'One correct outer wall expected');
        });
    }

    async testValidateCornerTilePlacementValid()
    {
        await this.test('Matching corner tile in inner walls passes corner validation', async () => {
            let validator = new WallsValidator();
            let innerWalls = new Array(25).fill(0);
            innerWalls[0] = 282;
            let map = {
                width: 5,
                height: 5,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: innerWalls}]
            };
            let result = validator.validateCornerTilePlacement(map, {corners: {'1,1': 282}});
            this.assert(true === result.isValid, 'Correct corner placement should pass');
            this.assertEqual(result.correctCorners, 1, 'One correct corner expected');
        });
    }

    async testValidateSingleCornerPlacementIncorrect()
    {
        await this.test('validateSingleCornerPlacement flags a tile that is not a configured corner', async () => {
            let validator = new WallsValidator();
            let layerData = new Array(25).fill(0);
            layerData[0] = 999;
            let result = validator.validateSingleCornerPlacement({index: 0}, layerData, 5, 5, {'1,1': 282});
            this.assertEqual(result.incorrectCorners, 1, 'Unknown corner tile should be incorrect');
            this.assert(0 < result.violations.length, 'A corner violation should be recorded');
        });
    }

    async testInitializeWallComponents()
    {
        await this.test('initializeWallComponents builds tile shortcuts and walls mapper', async () => {
            let validator = new WallsValidator();
            validator.initializeWallComponents({pathTile: 121, surroundingTiles: {'0,1': 129}, corners: {'1,1': 282}});
            this.assert(null !== validator.tilesShortcuts, 'tilesShortcuts should be constructed');
            this.assert(null !== validator.wallsMapper, 'wallsMapper should be constructed');
        });
    }

    async testPerformValidationPasses()
    {
        await this.test('performValidation passes on a consistent inner/outer wall map', async () => {
            let validator = new WallsValidator();
            let layers = this.buildBordersAndInnerWalls();
            let outerWalls = new Array(25).fill(0);
            outerWalls[22] = 129;
            layers.push({name: 'outer-walls', type: 'tilelayer', data: outerWalls});
            let map = {width: 5, height: 5, layers};
            let result = validator.performValidation(map, {surroundingTiles: {'0,1': 129}, corners: {}});
            this.assert(true === result, 'Consistent wall map should pass full wall validation');
        });
    }

    buildBordersAndInnerWalls()
    {
        let borders = new Array(25).fill(0);
        borders[12] = 1;
        let innerWalls = new Array(25).fill(0);
        innerWalls[17] = 129;
        return [
            {name: 'borders', type: 'tilelayer', data: borders},
            {name: 'inner-walls', type: 'tilelayer', data: innerWalls}
        ];
    }

    tilesAt(values)
    {
        let data = new Array(16).fill(0);
        for(let i = 0; i < values.length; i++){
            data[i] = values[i];
        }
        return data;
    }

}

module.exports.TestWallsValidator = TestWallsValidator;
