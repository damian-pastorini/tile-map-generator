/**
 *
 * Reldens - Test Map Type Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapTypeValidator } = require('../lib/validator/map-type-validator');

class TestMapTypeValidator extends BaseMapGeneratorTest
{

    async testDetermineMapTypeDungeon()
    {
        await this.test('blockMapBorder with entryPosition is dungeon', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({blockMapBorder: true, entryPosition: 'top'});
            this.assertEqual(type, 'dungeon', 'Expected dungeon type');
        });
    }

    async testDetermineMapTypeEnclosed()
    {
        await this.test('blockMapBorder without entry is enclosed', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({blockMapBorder: true});
            this.assertEqual(type, 'enclosed', 'Expected enclosed type');
        });
    }

    async testDetermineMapTypeNormal()
    {
        await this.test('mainPathSize without border is normal', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({mainPathSize: 3});
            this.assertEqual(type, 'normal', 'Expected normal type');
        });
    }

    async testDetermineMapTypeBasic()
    {
        await this.test('No flags result in basic type', async () => {
            let validator = new MapTypeValidator();
            // @possible-hallucinated-undefined-method
            let type = validator.determineMapType({});
            this.assertEqual(type, 'basic', 'Expected basic type');
        });
    }

    async testValidNormalMapPatternsPasses()
    {
        await this.test('Normal map with path layer passes pattern validation', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'path', type: 'tilelayer', data: [1]}]};
            let result = validator.validateNormalMapPatterns(map, {generateElementsPath: true});
            this.assert(true === result.isValid, 'Normal map with path should be valid');
        });
    }

    async testInvalidNormalMapPatternsFails()
    {
        await this.test('Normal map missing path layer fails pattern validation', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'ground', type: 'tilelayer', data: [1]}]};
            let result = validator.validateNormalMapPatterns(map, {generateElementsPath: true});
            this.assert(false === result.isValid, 'Missing path layer should fail');
            this.assert(false === result.connectingPaths, 'connectingPaths flag should be false');
        });
    }

    async testInvalidDungeonMapPatternsFails()
    {
        await this.test('Dungeon map missing border and entry fails', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'ground', type: 'tilelayer', data: [1]}]};
            let result = validator.validateDungeonMapPatterns(map, {});
            this.assert(false === result.isValid, 'Missing enclosure should fail');
            this.assert(false === result.enclosedSpaces, 'enclosedSpaces flag should be false');
        });
    }

    async testValidDungeonMapPatternsPasses()
    {
        await this.test('Dungeon map with border and entry passes pattern validation', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'collisions-map-border', type: 'tilelayer', data: [1]}]};
            let result = validator.validateDungeonMapPatterns(map, {entryPosition: 'top'});
            this.assert(true === result.isValid, 'Dungeon with border and entry should pass');
            this.assert(true === result.enclosedSpaces, 'enclosedSpaces flag should be true');
        });
    }

    async testCalculateLinearityScoreShortPath()
    {
        await this.test('calculateLinearityScore returns 1 for paths shorter than three tiles', async () => {
            let validator = new MapTypeValidator();
            let score = validator.calculateLinearityScore([{x: 0, y: 0}, {x: 1, y: 0}]);
            this.assertEqual(score, 1, 'Short path should score fully linear');
        });
    }

    async testCalculateLinearityScoreStraightLine()
    {
        await this.test('calculateLinearityScore scores a straight line by unique directions', async () => {
            let validator = new MapTypeValidator();
            let positions = [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}];
            let score = validator.calculateLinearityScore(positions);
            this.assertEqual(score, 0.75, 'One unique direction out of four expected');
        });
    }

    async testCalculateBranchingScoreCross()
    {
        await this.test('calculateBranchingScore counts the branching center of a cross', async () => {
            let validator = new MapTypeValidator();
            let positions = [{x: 1, y: 1}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 1, y: 0}, {x: 1, y: 2}];
            let score = validator.calculateBranchingScore(positions, 3, 3);
            this.assertEqual(score, 0.2, 'One branching point out of five tiles expected');
        });
    }

    async testCalculateConnectivityComplexityCross()
    {
        await this.test('calculateConnectivityComplexity averages neighbor connections of a cross', async () => {
            let validator = new MapTypeValidator();
            let positions = [{x: 1, y: 1}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 1, y: 0}, {x: 1, y: 2}];
            let score = validator.calculateConnectivityComplexity(positions, 3, 3);
            this.assertEqual(score, 0.4, 'Average of 1.6 connections normalized to 0.4 expected');
        });
    }

    async testClassifyNavigationPattern()
    {
        await this.test('classifyNavigationPattern selects pattern by thresholds', async () => {
            let validator = new MapTypeValidator();
            let thresholds = {linearHigh: 0.8, linearLow: 0.2, branchingHigh: 0.5, connectivityHigh: 0.7, semiLinear: 0.5};
            this.assertEqual(
                validator.classifyNavigationPattern(0.9, 0.1, 0.1, thresholds),
                'linear',
                'High linearity low branching should be linear'
            );
            this.assertEqual(
                validator.classifyNavigationPattern(0.1, 0.9, 0.1, thresholds),
                'branching',
                'High branching should be branching'
            );
            this.assertEqual(
                validator.classifyNavigationPattern(0.1, 0.1, 0.1, thresholds),
                'mixed',
                'No threshold met should be mixed'
            );
        });
    }

    async testAnalyzeNavigationPatternsNoThresholds()
    {
        await this.test('analyzeNavigationPatterns returns none without thresholds', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'path', type: 'tilelayer', data: [121]}]};
            let result = validator.analyzeNavigationPatterns(map, {pathTile: 121});
            this.assertEqual(result.pattern, 'none', 'Missing thresholds should yield none');
            this.assertEqual(result.complexity, 0, 'Complexity should be zero without thresholds');
        });
    }

    async testAnalyzeNavigationPatternsLinear()
    {
        await this.test('analyzeNavigationPatterns classifies a straight path as linear', async () => {
            let validator = new MapTypeValidator();
            let map = {width: 4, height: 1, layers: [{name: 'path', type: 'tilelayer', data: [121, 121, 121, 121]}]};
            let config = {pathTile: 121};
            let thresholds = {linearHigh: 0.7, linearLow: 0.1, branchingHigh: 0.5, connectivityHigh: 0.7, semiLinear: 0.5};
            let result = validator.analyzeNavigationPatterns(map, config, thresholds);
            this.assertEqual(result.pattern, 'linear', 'Straight path should be linear');
            this.assertEqual(result.branchingScore, 0, 'Straight path has no branching');
            this.assertEqual(result.linearityScore, 0.75, 'Straight path linearity score expected');
        });
    }

    async testPerformValidationNormalPasses()
    {
        await this.test('performValidation passes for a normal map with a path layer', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'path', type: 'tilelayer', data: [121]}]};
            let result = validator.performValidation(map, {mainPathSize: 3, generateElementsPath: true});
            this.assert(true === result, 'Normal map with path should pass performValidation');
        });
    }

    async testPerformValidationDungeonPasses()
    {
        await this.test('performValidation passes for a dungeon map with border and entry', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'collisions-map-border', type: 'tilelayer', data: [1]}]};
            let result = validator.performValidation(map, {blockMapBorder: true, entryPosition: 'top'});
            this.assert(true === result, 'Dungeon map should pass performValidation');
        });
    }

    async testPerformValidationBasicPasses()
    {
        await this.test('performValidation passes trivially for a basic map type', async () => {
            let validator = new MapTypeValidator();
            let result = validator.performValidation({layers: []}, {});
            this.assert(true === result, 'Basic map type should pass performValidation');
        });
    }

}

module.exports.TestMapTypeValidator = TestMapTypeValidator;
