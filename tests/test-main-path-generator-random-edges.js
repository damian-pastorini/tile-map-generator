/**
 *
 * Reldens - Test Main Path Generator Random Edges
 *
 * Covers the random main path edge rules: every random path stays on the walkable row or column of the edge it
 * was drawn for, the excluded (entry) edge is never drawn, and the exit main path is placed on another edge with
 * its border cells painted.
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MainPathGeneratorBuilder } = require('./main-path-generator-builder');
const { MainPathEdgesConstants } = require('../lib/constants');

class TestMainPathGeneratorRandomEdges extends BaseMapGeneratorTest
{

    collectRandomPaths(generator, seed, draws, isBorderWalkable, excludedEdge)
    {
        let paths = [];
        Math.random = this.seedRandom(seed);
        try {
            for(let i = 0; i < draws; i++){
                paths.push(generator.generateRandomMainPath(8, 8, 3, isBorderWalkable, excludedEdge));
            }
        } finally {
            this.restoreMathRandom();
        }
        return paths;
    }

    async testRandomPathsStayOnTheWalkableEdgeCells()
    {
        await this.test('generateRandomMainPath keeps every inner path tile off the border and corners', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let paths = this.collectRandomPaths(generator, 2468, 60, false);
            let innerPoints = paths.flatMap(path => path.generatedMainPathIndexes);
            let outsidePoints = innerPoints.filter(point => 1 > point.x || 6 < point.x || 1 > point.y || 6 < point.y);
            this.assertDeepEqual(outsidePoints, [], 'Every inner main path tile must be inside the walkable area');
            this.assertDeepEqual(
                paths.map(path => generator.mainPathMirror.resolvePathEdge(path.generatedMainPathIndexes, 8, 8)),
                paths.map(path => path.edge),
                'Every random main path must run along the edge it was generated for'
            );
        });
    }

    async testRandomPathsNeverUseTheExcludedEdge()
    {
        await this.test('generateRandomMainPath never uses the excluded edge', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let paths = this.collectRandomPaths(generator, 1357, 40, false, MainPathEdgesConstants.TOP);
            let usedEdges = [...new Set(paths.map(path => path.edge))].sort();
            this.assertDeepEqual(
                usedEdges,
                [MainPathEdgesConstants.RIGHT, MainPathEdgesConstants.BOTTOM, MainPathEdgesConstants.LEFT],
                'Only the three edges different from the excluded one must be drawn'
            );
        });
    }

    async testPlaceExitMainPathOnAnotherEdge()
    {
        await this.test('placeExitMainPath places the exit path and its border cells on another edge', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let pathLayerData = new Array(64).fill(0);
            Math.random = this.seedRandom(97531);
            let exitResult = null;
            try {
                exitResult = generator.placeExitMainPath(
                    pathLayerData,
                    Array.from({length: 8}, () => Array(8).fill(true)),
                    8,
                    8,
                    MainPathEdgesConstants.BOTTOM,
                    3,
                    false,
                    9
                );
            } finally {
                this.restoreMathRandom();
            }
            this.assert(MainPathEdgesConstants.BOTTOM !== exitResult.edge, 'The exit must not use the entry edge');
            let placedIndexes = [...exitResult.generatedMainPathIndexes, ...exitResult.generatedMainPathIndexesBorder]
                .map(point => point.index)
                .sort((indexA, indexB) => indexA - indexB);
            let paintedIndexes = pathLayerData
                .map((tile, index) => 9 === tile ? index : -1)
                .filter(index => -1 !== index);
            this.assertDeepEqual(paintedIndexes, placedIndexes, 'Exactly the exit path and border cells are painted');
            this.assertEqual(placedIndexes.length, 6, 'Three inner and three border exit cells');
        });
    }

    async testPlaceExitMainPathWithZeroSize()
    {
        await this.test('placeExitMainPath places nothing when the main path size is zero', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let pathLayerData = new Array(64).fill(0);
            let exitResult = generator.placeExitMainPath(
                pathLayerData,
                [],
                8,
                8,
                MainPathEdgesConstants.TOP,
                0,
                false,
                9
            );
            this.assertDeepEqual(exitResult.generatedMainPathIndexes, [], 'No exit path indexes');
            this.assertDeepEqual(pathLayerData, new Array(64).fill(0), 'Nothing is painted');
        });
    }

}

module.exports.TestMainPathGeneratorRandomEdges = TestMainPathGeneratorRandomEdges;
