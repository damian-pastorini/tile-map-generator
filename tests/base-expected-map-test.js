/**
 *
 * Reldens - Base Expected Map Test
 *
 * Shared harness for real-map proving tests. A scenario generates a complete map from the committed real
 * element files under a fixed seed and compares the full result, with the base compareMapOutputs helper,
 * against a committed deterministic expected map file under tests/test-data (materialized on first run,
 * then committed), so every expected map can be verified visually by opening it in Tiled.
 *
 */

const { BaseFunctionalityTest } = require('./base-functionality-test');
const { ElementPositionAnalyzer } = require('../lib/map/element-position-analyzer');
const { JsonFormatter } = require('../lib/map/json-formatter');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class BaseExpectedMapTest extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
    }

    async generateSeededResult(config, seed)
    {
        this.currentSeed = seed;
        Math.random = this.seedRandom(seed);
        try {
            let result = await this.testCurrentGenerationWithGenerator(config);
            this.assert(result.map, 'Map generation failed - '+this.getLastValidationError(config));
            return result;
        } finally {
            this.restoreMathRandom();
        }
    }

    loadOrCreateExpectedMap(expectedFileName, generatedMap)
    {
        let expectedPath = FileHandler.joinPaths(this.testDataFolder, expectedFileName);
        let existing = FileHandler.fetchFileJson(expectedPath);
        if(existing){
            return existing;
        }
        FileHandler.writeFile(expectedPath, JsonFormatter.mapToJSON(generatedMap));
        return sc.deepJsonClone(generatedMap);
    }

    async runExpectedMapScenario(config, seed, expectedFileName)
    {
        let result = await this.generateSeededResult(config, seed);
        let expected = this.loadOrCreateExpectedMap(expectedFileName, result.map);
        this.compareMapOutputs(expected, result.map);
        return result;
    }

    applyScenarioDefaults(config, mapName, mapWidth, mapHeight)
    {
        config.mapName = mapName;
        config.mapFileName = mapName+'.json';
        config.mapSize = {mapWidth, mapHeight};
        config.collisionLayersForPaths = ['collisions', 'over-player', 'shadow', 'base'];
        return config;
    }

    collectElementBounds(map, config)
    {
        return this.elementPositionAnalyzer.gatherElementPositions(map, config).map(position => {
            return {
                element: position.layerName,
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height
            };
        });
    }

    assertElementBounds(map, config, expectedBounds, message)
    {
        let bounds = this.collectElementBounds(map, config);
        this.assertDeepEqual(bounds, expectedBounds, message+' - got: '+sc.toJsonString(bounds));
    }

}

module.exports.BaseExpectedMapTest = BaseExpectedMapTest;
