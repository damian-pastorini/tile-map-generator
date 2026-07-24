/**
 *
 * Reldens - Test Spot Border Analyzer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotBorderAnalyzer } = require('../lib/generator/spot-border-analyzer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestSpotBorderAnalyzer extends BaseMapGeneratorTest
{

    async testFindBorderTiles()
    {
        await this.test('findBorderTiles returns spot tiles with an empty neighbor', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let layer = [
                5, 5, 5,
                5, 5, 5,
                5, 5, 5
            ];
            let config = {width: 3, height: 3, applyCornersTiles: false};
            let borderTiles = analyzer.findBorderTiles(layer, config, 5);
            this.assertEqual(borderTiles.length, 0, 'Fully filled layer has no empty neighbors');
            layer[4] = 0;
            let withHole = analyzer.findBorderTiles(layer, config, 5);
            this.assert(-1 !== withHole.indexOf(1), 'Tile above hole is a border');
            this.assert(-1 !== withHole.indexOf(3), 'Tile left of hole is a border');
        });
    }

    async testFindBorderTilesWithCornersMode()
    {
        await this.test('findBorderTiles in corners mode returns non spot non empty tiles', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let layer = [5, 9, 0, 5, 5, 0, 0, 0, 0];
            let config = {width: 3, height: 3, applyCornersTiles: true};
            let borderTiles = analyzer.findBorderTiles(layer, config, 5);
            this.assertEqual(borderTiles.length, 1, 'Only the non spot non empty tile counts');
            this.assertEqual(borderTiles[0], 1, 'Index of the differing tile');
        });
    }

    async testScanContinuousSequences()
    {
        await this.test('scanContinuousSequences finds runs of required length', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let groups = [[], [0, 1, 2], []];
            let sequences = analyzer.scanContinuousSequences(groups, 2, (primary, value) => primary * 3 + value);
            this.assertEqual(sequences.length, 2, 'Two overlapping runs of length two');
            this.assertDeepEqual(sequences[0], [3, 4], 'First run indexes');
            this.assertDeepEqual(sequences[1], [4, 5], 'Second run indexes');
        });
    }

    async testFindAdjacentBorderTiles()
    {
        await this.test('findAdjacentBorderTiles returns nearest tiles to start', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let borderTiles = [0, 1, 2, 8];
            let result = analyzer.findAdjacentBorderTiles(borderTiles, 0, 3, 1);
            this.assertEqual(result.length, 1, 'Returns requested count');
            this.assertEqual(result[0], 1, 'Closest tile to start index zero');
        });
    }

    async testFindAdjacentBorderTilesZeroCount()
    {
        await this.test('findAdjacentBorderTiles returns empty for zero count', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let result = analyzer.findAdjacentBorderTiles([0, 1, 2], 0, 3, 0);
            this.assertEqual(result.length, 0, 'Zero count yields empty result');
        });
    }

    async testFindContinuousBorderSequences()
    {
        await this.test('findContinuousBorderSequences includes horizontal runs', async () => {
            let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
            let borderTiles = [3, 4, 5];
            let sequences = analyzer.findContinuousBorderSequences(borderTiles, 3, 3, 3);
            this.assert(0 < sequences.length, 'At least one sequence found');
            this.assertDeepEqual(sequences[0], [3, 4, 5], 'Horizontal run of three');
        });
    }

    async testFetchRandomBorderTileIndex()
    {
        Math.random = this.seedRandom(13579);
        try {
            await this.test('fetchRandomBorderTileIndex returns an edge tile index from the candidates', async () => {
                let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
                let borderTiles = [0, 1, 2];
                let result = analyzer.fetchRandomBorderTileIndex(borderTiles, 3, 3, false);
                this.assert(-1 !== borderTiles.indexOf(result), 'Result is one of the border tiles');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testFetchPathTileIndexesSingleSize()
    {
        Math.random = this.seedRandom(24680);
        try {
            await this.test('fetchPathTileIndexes returns a single border tile for path size one', async () => {
                let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
                let borderTiles = [0, 1, 2];
                let result = analyzer.fetchPathTileIndexes(borderTiles, 3, 3, false, 1);
                this.assertEqual(result.length, 1, 'One tile selected for path size one');
                this.assert(-1 !== borderTiles.indexOf(result[0]), 'Selected tile is a border tile');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testFetchPathTileIndexesUsesContinuousSequence()
    {
        Math.random = this.seedRandom(11111);
        try {
            await this.test('fetchPathTileIndexes returns a continuous sequence for larger path size', async () => {
                let analyzer = new SpotBorderAnalyzer(new LayerDataFactory());
                let borderTiles = [0, 1, 2];
                let result = analyzer.fetchPathTileIndexes(borderTiles, 3, 3, false, 3);
                this.assertEqual(result.length, 3, 'Sequence of three returned');
                this.assertDeepEqual(result, [0, 1, 2], 'Continuous horizontal sequence returned');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

}

module.exports.TestSpotBorderAnalyzer = TestSpotBorderAnalyzer;
