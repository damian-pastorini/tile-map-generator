/**
 *
 * Reldens - Test Path Generation Configuration
 *
 * Real-map proving tests for the path generation configuration options. Every case generates a complete map
 * using the committed real element files (house-001.json and tree.json, the house provides a real "path"
 * layer for element path routing) under a fixed seed, and compares the full result against a per-case
 * committed deterministic expected map file under tests/test-data (materialized on first run, then
 * committed). Each case also proves exact deterministic path numbers (main path indexes and path layer tile
 * counts), so the effect of every configuration option (mainPathSize, generateElementsPath, pathSize,
 * applySurroundingPathTiles, previousMainPath and the elements allow-paths-in-free-space options) can be
 * verified visually by opening the expected map in Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { Logger, sc } = require('@reldens/utils');

class TestPathGenerationConfiguration extends BaseExpectedMapTest
{

    buildPathScenarioConfig(mapName, overrides)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.placeElementsOrder = 'inOrder';
        config.orderElementsBySize = false;
        return Object.assign(config, overrides);
    }

    logPathCounts(map, config)
    {
        let pathLayer = map.layers.find(layer => 'path' === layer.name);
        this.assert(pathLayer, 'The generated map must contain the path layer');
        let purePathTiles = TileCountingUtility.countTilesInLayer(pathLayer.data, config.pathTile);
        let nonZeroTiles = TileCountingUtility.countNonZeroTiles(pathLayer.data);
        Logger.log(100, '', 'Path counts '+config.mapName+': '+purePathTiles+'/'+nonZeroTiles);
    }

    async testMainPathPlacementMatchesCommittedExpectedMap()
    {
        await this.test('the seeded main path lands on exact border indexes and matches its expected map', async () => {
            let config = this.buildPathScenarioConfig('path-generation-main-path', {});
            let result = await this.runExpectedMapScenario(config, 11111, 'path-generation-main-path-expected.json');
            this.logPathCounts(result.map, config);
            this.assertDeepEqual(
                result.generator.generatedMainPathIndexes,
                [
                    {index: 43, x: 13, y: 1},
                    {index: 44, x: 14, y: 1},
                    {index: 45, x: 15, y: 1}
                ],
                'The seeded main path must land on the exact top border indexes 43, 44 and 45'
                    +' - got: '+sc.toJsonString(result.generator.generatedMainPathIndexes)
            );
        });
    }

    async testWithoutElementsPathsOnlyMainPathRemains()
    {
        await this.test('generateElementsPath false keeps only the main path and matches its expected map', async () => {
            let config = this.buildPathScenarioConfig('path-generation-no-element-paths', {generateElementsPath: false});
            let result = await this.runExpectedMapScenario(config, 11111, 'path-generation-no-element-paths-expected.json');
            this.logPathCounts(result.map, config);
        });
    }

    async testPathSizeTwoExpandsElementPaths()
    {
        await this.test('pathSize two expands the routed element paths and matches its expected map', async () => {
            let config = this.buildPathScenarioConfig('path-generation-path-size-two', {pathSize: 2});
            let result = await this.runExpectedMapScenario(config, 11111, 'path-generation-path-size-two-expected.json');
            this.logPathCounts(result.map, config);
        });
    }

    async testWithoutSurroundingTilesPathLayerKeepsOnlyPurePathTiles()
    {
        await this.test('applySurroundingPathTiles false leaves only pure path tiles and matches its expected map', async () => {
            let config = this.buildPathScenarioConfig('path-generation-plain-tiles', {applySurroundingPathTiles: false});
            let result = await this.runExpectedMapScenario(config, 11111, 'path-generation-plain-tiles-expected.json');
            this.logPathCounts(result.map, config);
            let pathLayer = result.map.layers.find(layer => 'path' === layer.name);
            this.assertEqual(
                TileCountingUtility.countNonZeroTiles(pathLayer.data),
                TileCountingUtility.countTilesInLayer(pathLayer.data, config.pathTile),
                'Without surrounding tiles the path layer must only contain pure path tiles'
            );
        });
    }

    mirrorMainPath(previousMainPath, mapWidth, mapHeight)
    {
        if(previousMainPath.every(point => point.y === previousMainPath[0].y)){
            return previousMainPath.map(point => {
                let y = mapHeight - 1 - point.y;
                return {index: y * mapWidth + point.x, x: point.x, y};
            });
        }
        return previousMainPath.map(point => {
            let x = mapWidth - 1 - point.x;
            return {index: point.y * mapWidth + x, x, y: point.y};
        });
    }

    async testOppositeMainPathMirrorsTheSourceMapMainPath()
    {
        await this.test('previousMainPath mirrors the committed source map main path to the opposite edge', async () => {
            let sourceConfig = this.buildPathScenarioConfig('path-generation-opposite-source', {isBorderWalkable: true});
            let sourceResult = await this.runExpectedMapScenario(
                sourceConfig,
                11111,
                'path-generation-opposite-source-expected.json'
            );
            this.logPathCounts(sourceResult.map, sourceConfig);
            let sourceMainPath = sourceResult.generator.generatedMainPathIndexes;
            Logger.log(100, '', 'Source main path: '+sc.toJsonString(sourceMainPath));
            let oppositeConfig = this.buildPathScenarioConfig(
                'path-generation-opposite-main-path',
                {isBorderWalkable: true, previousMainPath: sourceMainPath}
            );
            let oppositeResult = await this.runExpectedMapScenario(
                oppositeConfig,
                11111,
                'path-generation-opposite-main-path-expected.json'
            );
            this.logPathCounts(oppositeResult.map, oppositeConfig);
            let oppositeMainPath = oppositeResult.generator.generatedMainPathIndexes;
            Logger.log(100, '', 'Opposite main path: '+sc.toJsonString(oppositeMainPath));
            this.assertDeepEqual(
                oppositeMainPath,
                this.mirrorMainPath(sourceMainPath, 30, 30),
                'The opposite main path must be the exact mirror of the committed source map main path'
                    +' - got: '+sc.toJsonString(oppositeMainPath)
            );
            this.assert(oppositeResult.generator.hasAssociatedMap, 'The opposite main path must mark the map as associated');
        });
    }

    async testPathsAllowedInElementsFreeSpaceMatchExpectedMap()
    {
        await this.test('allowing paths in the tree free space routes the paths through it on the expected map', async () => {
            let config = this.buildPathScenarioConfig(
                'path-generation-paths-in-free-space',
                {elementsAllowPathsInFreeSpace: {house1: true, tree: true}}
            );
            let result = await this.runExpectedMapScenario(
                config,
                11111,
                'path-generation-paths-in-free-space-expected.json'
            );
            this.logPathCounts(result.map, config);
        });
    }

    async testPathsBlockedInElementsFreeSpaceMatchExpectedMap()
    {
        await this.test('blocking paths in the tree free space keeps it clear while the door still connects', async () => {
            let config = this.buildPathScenarioConfig(
                'path-generation-paths-avoid-free-space',
                {elementsAllowPathsInFreeSpace: {house1: true, tree: false}}
            );
            let result = await this.runExpectedMapScenario(
                config,
                11111,
                'path-generation-paths-avoid-free-space-expected.json'
            );
            this.logPathCounts(result.map, config);
        });
    }

}

module.exports.TestPathGenerationConfiguration = TestPathGenerationConfiguration;
