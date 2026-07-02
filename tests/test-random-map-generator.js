/**
 *
 * Reldens - Test Random Map Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { PathConnector } = require('../lib/generator/path-connector');
const { SpotGenerator } = require('../lib/generator/spot-generator');
const { MapGridBuilder } = require('../lib/generator/map-grid-builder');

class TestRandomMapGenerator extends BaseMapGeneratorTest
{

    async testSetOptionsAssignsBaseOptions()
    {
        await this.test('setOptions assigns base, path and remaining options from the config', async () => {
            let config = this.setupMinimalConfig();
            config.mapName = 'my-map.json';
            let generator = new RandomMapGenerator(config);
            this.assertEqual(generator.tileSize, 32, 'tileSize must be read from options');
            this.assertEqual(generator.columns, 18, 'columns must be read from options');
            this.assertEqual(generator.tileCount, 306, 'tileCount must be read from options');
            this.assertEqual(generator.mapName, 'my-map', 'mapName must be stripped of the json extension');
            this.assertEqual(generator.mapFileName, 'my-map.json', 'mapFileName must keep the json extension');
            this.assertEqual(generator.pathTile, 121, 'pathTile must be read from options');
            this.assertEqual(generator.groundTile, 116, 'groundTile must be read from options');
            this.assertEqual(generator.surroundingTiles['-1,-1'], 127, 'surroundingTiles must be assigned');
            this.assertEqual(generator.corners['1,1'], 282, 'corners must be assigned');
            this.assertEqual(generator.mapBackgroundColor, '#000000', 'mapBackgroundColor must default');
            this.assertEqual(generator.placeElementsOrder, 'random', 'placeElementsOrder must default to random');
            this.assertDeepEqual(generator.autoMergeLayersByKeys, [], 'autoMergeLayersByKeys must default to empty array');
        });
    }

    async testAssignPathAndBorderOptionsBuildsBorderTiles()
    {
        await this.test('assignPathAndBorderOptions derives bordersTiles from a single borderTile', async () => {
            let config = this.setupMinimalConfig();
            config.borderTile = 77;
            let generator = new RandomMapGenerator(config);
            this.assertEqual(generator.borderTile, 77, 'borderTile must be read from options');
            this.assertDeepEqual(
                generator.bordersTiles,
                {top: 77, right: 77, bottom: 77, left: 77},
                'bordersTiles must be derived from borderTile on each side'
            );
            this.assertEqual(generator.pathSize, 1, 'pathSize must default to 1');
        });
    }

    async testAssignBaseOptionsPicksGroundTileFromList()
    {
        await this.test('assignBaseOptions selects the ground tile from groundTiles when groundTile is zero', async () => {
            let config = this.setupMinimalConfig();
            config.groundTile = 0;
            config.groundTiles = [987];
            let generator = new RandomMapGenerator(config);
            this.assertEqual(generator.groundTile, 987, 'groundTile must be selected from the single groundTiles entry');
        });
    }

    async testInitializeRuntimeStateResetsFields()
    {
        await this.test('initializeRuntimeState resets the runtime working fields', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            generator.mapWidth = 99;
            generator.mapGrid = [1, 2, 3];
            generator.generatedChangePoints = {x: 1};
            generator.hasAssociatedMap = true;
            generator.initializeRuntimeState();
            this.assertEqual(generator.mapWidth, 0, 'mapWidth must be reset to 0');
            this.assertEqual(generator.mapHeight, 0, 'mapHeight must be reset to 0');
            this.assertDeepEqual(generator.mapGrid, [], 'mapGrid must be reset to an empty array');
            this.assertDeepEqual(generator.generatedChangePoints, {}, 'generatedChangePoints must be reset');
            this.assertEqual(generator.hasAssociatedMap, false, 'hasAssociatedMap must be reset to false');
        });
    }

    async testValidateReturnsTrueAndFalse()
    {
        await this.test('validate returns true for a complete config and false for an empty generator', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            this.assertEqual(generator.validate(), true, 'A complete minimal config must validate');
            let emptyGenerator = new RandomMapGenerator();
            this.assertEqual(emptyGenerator.validate(), false, 'An unconfigured generator must not validate');
        });
    }

    async testCreateTiledMapObjectStructure()
    {
        await this.test('createTiledMapObject builds a Tiled map object using the generator state', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            generator.mapWidth = 4;
            generator.mapHeight = 3;
            generator.addMapProperty('mapTitle', 'string', 'Sample');
            let layers = [
                {name: 'ground', type: 'tilelayer', data: []},
                {name: 'path', type: 'tilelayer', data: []}
            ];
            let map = generator.createTiledMapObject(layers);
            this.assertEqual(map.type, 'map', 'type must be map');
            this.assertEqual(map.orientation, 'orthogonal', 'orientation must be orthogonal');
            this.assertEqual(map.width, 4, 'width must default to the generator mapWidth');
            this.assertEqual(map.height, 3, 'height must default to the generator mapHeight');
            this.assertEqual(map.tileheight, 32, 'tileheight must match the tile size');
            this.assertEqual(map.nextlayerid, 3, 'nextlayerid must be the layers length plus one');
            this.assertEqual(map.layers.length, 2, 'layers must be carried through');
            this.assertEqual(map.tilesets.length, 1, 'a single tileset must be produced');
            this.assertEqual(map.tilesets[0].columns, 18, 'tileset columns must match the config');
            this.assertEqual(map.properties[0].name, 'mapTitle', 'map custom properties must be attached');
        });
    }

    async testCreateTiledMapObjectHonorsExplicitSize()
    {
        await this.test('createTiledMapObject honors explicit width and height arguments', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            generator.mapWidth = 10;
            generator.mapHeight = 10;
            let map = generator.createTiledMapObject([], 7, 5);
            this.assertEqual(map.width, 7, 'explicit width must override the generator state');
            this.assertEqual(map.height, 5, 'explicit height must override the generator state');
            this.assertEqual(map.nextlayerid, 1, 'nextlayerid must be one for an empty layers list');
        });
    }

    async testGenerateLayerWithDataReplacesNulls()
    {
        await this.test('generateLayerWithData builds a tilelayer and replaces null tiles with zero', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            let layer = generator.generateLayerWithData('demo', [5, null, 7, 0], 2, 2);
            this.assertEqual(layer.name, 'demo', 'layer name must be set');
            this.assertEqual(layer.type, 'tilelayer', 'layer type must be tilelayer');
            this.assertEqual(layer.width, 2, 'layer width must be the provided width');
            this.assertEqual(layer.height, 2, 'layer height must be the provided height');
            this.assertDeepEqual(layer.data, [5, 0, 7, 0], 'null tiles must be replaced by zero');
            this.assertEqual(layer.visible, true, 'layer must be visible');
            this.assertEqual(layer.opacity, 1, 'layer opacity must be 1');
        });
    }

    async testAddAndFetchMapProperty()
    {
        await this.test('addMapProperty stores and fetchMapProperty retrieves the custom map property', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            generator.addMapProperty('currentFloor', 'int', 2);
            let fetched = generator.fetchMapProperty('currentFloor');
            this.assert(false !== fetched, 'fetchMapProperty must find a stored property');
            this.assertEqual(fetched.name, 'currentFloor', 'fetched property name must match');
            this.assertEqual(fetched.type, 'int', 'fetched property type must match');
            this.assertEqual(fetched.value, 2, 'fetched property value must match');
            this.assertEqual(generator.fetchMapProperty('missing'), false, 'fetchMapProperty must return false when absent');
        });
    }

    async testResetInstanceWiresSubInstances()
    {
        await this.test('resetInstance constructs and rewires the collaborator sub-instances', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            this.assert(generator.pathConnector instanceof PathConnector, 'pathConnector must be wired');
            this.assert(generator.spotGenerator instanceof SpotGenerator, 'spotGenerator must be wired');
            this.assert(generator.mapGridBuilder instanceof MapGridBuilder, 'mapGridBuilder must be wired');
            let previousPathConnector = generator.pathConnector;
            let previousSpotGenerator = generator.spotGenerator;
            generator.resetInstance(this.setupMinimalConfig());
            this.assert(
                generator.pathConnector !== previousPathConnector,
                'resetInstance must build a fresh pathConnector instance'
            );
            this.assert(
                generator.spotGenerator !== previousSpotGenerator,
                'resetInstance must build a fresh spotGenerator instance'
            );
        });
    }

    async testGenerateProducesValidMap()
    {
        await this.test('generate runs a full generation and returns a valid Tiled map', async () => {
            Math.random = this.seedRandom(45454);
            try {
                let config = this.setupBasicConfig();
                config.mapName = 'rmg-generate-test';
                let generator = new RandomMapGenerator(config);
                let map = await generator.generate();
                this.assertValidMapStructure(map);
                let groundLayer = map.layers.find(layer => 'ground' === layer.name);
                this.assert(groundLayer, 'A ground layer must be produced by a full generation');
                this.assert(0 < generator.mapWidth, 'generation must compute a positive map width');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testGenerateReturnsFalseWhenNotReady()
    {
        await this.test('generate returns false when the generator was never configured', async () => {
            let generator = new RandomMapGenerator();
            let result = await generator.generate();
            this.assertEqual(result, false, 'An unconfigured generate call must return false');
        });
    }

    async runProviderEntryPoint(methodName, seed)
    {
        Math.random = this.seedRandom(seed);
        try {
            let config = this.setupCompositeConfig();
            if(!config.tileMapJSON){
                return false;
            }
            let generator = new RandomMapGenerator();
            let returned = await generator[methodName](config);
            this.assertEqual(returned, generator, methodName + ' must return the generator instance');
            this.assert(null !== generator.elementsProvider, methodName + ' must build the elementsProvider');
            this.assert(
                0 < Object.keys(generator.mappedMapDataFromProvider).length,
                methodName + ' must populate mappedMapDataFromProvider from the provider'
            );
            return generator;
        } finally {
            this.restoreMathRandom();
        }
    }

    async testFromElementsProviderBuildsMappedData()
    {
        await this.test('fromElementsProvider splits the composite and maps provider data onto the generator', async () => {
            let generator = await this.runProviderEntryPoint('fromElementsProvider', 77001);
            if(false === generator){
                return;
            }
            this.assert(false !== generator.tileSize, 'tileSize must be derived from the optimized map');
        });
    }

    async testFromAssociationDelegatesToProvider()
    {
        await this.test('fromAssociation delegates to fromElementsProvider and returns the generator', async () => {
            await this.runProviderEntryPoint('fromAssociation', 77002);
        });
    }

    async testApplyVariationsGuardsWithoutRandomGroundTiles()
    {
        await this.test('applyVariations is a no-op when no random ground tiles are configured', async () => {
            let generator = new RandomMapGenerator(this.setupMinimalConfig());
            generator.randomGroundTiles = [];
            generator.groundVariationsLayerData = [42];
            generator.applyVariations();
            this.assertDeepEqual(
                generator.groundVariationsLayerData,
                [42],
                'applyVariations must leave the variations layer untouched without random ground tiles'
            );
        });
    }

    async testApplyVariationsBuildsVariationLayer()
    {
        await this.test('applyVariations builds a ground variations layer when random ground tiles exist', async () => {
            Math.random = this.seedRandom(31337);
            try {
                let generator = new RandomMapGenerator(this.setupMinimalConfig());
                generator.mapWidth = 4;
                generator.mapHeight = 4;
                generator.randomGroundTiles = [200, 201, 202];
                generator.variableTilesPercentage = 100;
                generator.pathLayerData = new Array(16).fill(0);
                generator.applyVariations();
                this.assertEqual(
                    generator.groundVariationsLayerData.length,
                    16,
                    'the variations layer must span the whole map grid'
                );
                let placed = generator.groundVariationsLayerData.filter(tile => 0 !== tile);
                this.assert(0 < placed.length, 'at 100 percent some variation tiles must be placed');
                for(let tile of placed){
                    this.assert(
                        200 === tile || 201 === tile || 202 === tile,
                        'placed variation tiles must come from the configured random ground tiles'
                    );
                }
            } finally {
                this.restoreMathRandom();
            }
        });
    }

}

module.exports.TestRandomMapGenerator = TestRandomMapGenerator;
