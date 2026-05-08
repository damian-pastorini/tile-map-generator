/**
 *
 * Reldens - Test Spots Generation
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { SpotsValidator } = require('../../lib/validator/spots-validator');
const { PropertiesMapper } = require('../../lib/generator/properties-mapper');

class TestSpotsGeneration extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.spotsValidator = new SpotsValidator();
    }

    setupSpotsConfig()
    {
        let config = this.setupBasicConfig();
        config.groundSpots = {
            'test-spot-1': {
                quantity: 1,
                width: 3,
                height: 2,
                walkable: true,
                layerName: 'ground-spot-test-spot-1',
                tilesKey: 'test-spot-1',
                spotTile: 116,
                spotLayers: {'spot-layer-1': [1,2,3,4,5,6]}
            },
            'test-spot-2': {
                quantity: 1,
                width: 2,
                height: 3,
                walkable: false,
                layerName: 'ground-spot-test-spot-2-collisions',
                tilesKey: 'test-spot-2',
                spotTile: 117,
                spotLayers: {'spot-layer-2': [7,8,9,10,11,12]}
            }
        };
        config.groundSpotsPropertiesMappers = {
            'test-spot-1': new PropertiesMapper('test-spot-1'),
            'test-spot-2': new PropertiesMapper('test-spot-2')
        };
        return config;
    }

    setupCompositeConfigWithSpots()
    {
        let config = this.setupCompositeConfig();
        config.groundSpots = {
            'composite-spot-1': {
                quantity: 1,
                width: 2,
                height: 2,
                walkable: true,
                layerName: 'ground-spot-composite-spot-1',
                tilesKey: 'composite-spot-1',
                spotTile: 116,
                spotLayers: {'composite-layer-1': [1,2,3,4]}
            }
        };
        config.groundSpotsPropertiesMappers = {
            'composite-spot-1': new PropertiesMapper('composite-spot-1')
        };
        return config;
    }

    async testSpotDimensionsAccuracyWithElementsProvider()
    {
        let config = this.setupCompositeConfigWithSpots();
        await this.testWithDeterministicSeed('Spot dimensions accuracy with elements provider', config, 11122, async (map, config) => {
            let validation = this.spotsValidator.validateSpotDimensions(map, config);
            this.logFunctionalityResult('Spot Dimensions Accuracy With Elements Provider', validation);
            this.assert(validation.isValid, 'Spot dimensions must match configuration exactly');
            this.assertEqual(validation.invalidDimensions, 0, 'No invalid dimensions allowed');
        });
    }

    async testSpotDimensionsAccuracyWithDirectConfig()
    {
        let config = this.setupSpotsConfig();
        await this.testWithDeterministicSeed('Spot dimensions accuracy with direct config', config, 11123, async (map, config) => {
            let validation = this.spotsValidator.validateSpotDimensions(map, config);
            this.logFunctionalityResult('Spot Dimensions Accuracy With Direct Config', validation);
            this.assert(validation.isValid, 'Spot dimensions must match configuration exactly');
            this.assertEqual(validation.invalidDimensions, 0, 'No invalid dimensions allowed');
        });
    }

    async testSpotQuantitiesCorrect()
    {
        let config = this.setupSpotsConfig();
        config.groundSpots['test-spot-1'].quantity = 2;
        await this.testWithDeterministicSeed('Spot quantities correct', config, 33344, async (map, config) => {
            let validation = this.spotsValidator.validateSpotQuantities(map, config);
            this.logFunctionalityResult('Spot Quantities Correct', validation);
            this.assert(validation.isValid, 'Spot quantities must be exactly as configured');
            this.assertEqual(validation.accuracyPercentage, 100, 'Spot quantity accuracy must be 100%');
        });
    }

    async testSpotConnectivityToPath()
    {
        let config = this.setupSpotsConfig();
        config.mainPathSize = 3;
        await this.testWithDeterministicSeed('Spot connectivity to path', config, 55566, async (map, config) => {
            let validation = this.spotsValidator.validateSpotConnectivity(map, config, 15);
            this.logFunctionalityResult('Spot Connectivity To Path', validation);
            this.assert(validation.isValid, 'All spots must be connected to path network');
            this.assertEqual(validation.connectivityPercentage, 100, 'Connectivity must be 100%');
        });
    }

    async testSpotWithIsElementProperty()
    {
        let config = this.setupBasicConfig();
        config.groundSpots = {
            'ie-spot': {
                quantity: 1,
                width: 3,
                height: 3,
                walkable: true,
                layerName: 'ground-spot-ie-spot',
                tilesKey: 'ie-spot',
                spotTile: 116,
                isElement: true,
                freeSpaceAround: 1
            }
        };
        config.groundSpotsPropertiesMappers = {
            'ie-spot': new PropertiesMapper('ie-spot')
        };
        await this.testWithDeterministicSeed('Spot with isElement property', config, 77701, async (map, config) => {
            let validation = this.spotsValidator.validateSpotQuantities(map, config);
            this.logFunctionalityResult('Spot With isElement Property', validation);
            this.assert(validation.isValid, 'isElement spot must be placed as a map element');
            this.assertEqual(validation.totalFound, 1, 'Exactly one isElement spot must be found in map');
        });
    }

    async testSpotWithDepthProperty()
    {
        let config = this.setupBasicConfig();
        config.groundSpots = {
            'depth-spot': {
                quantity: 1,
                width: 3,
                height: 3,
                walkable: true,
                layerName: 'ground-spot-depth-spot',
                tilesKey: 'depth-spot',
                spotTile: 116,
                isElement: true,
                depth: 'ground',
                freeSpaceAround: 1
            }
        };
        config.groundSpotsPropertiesMappers = {
            'depth-spot': new PropertiesMapper('depth-spot')
        };
        await this.testWithDeterministicSeed('Spot with depth property', config, 77702, async (map) => {
            let groundLayerIndex = map.layers.findIndex(l => 'ground' === l.name);
            let spotLayerIndex = map.layers.findIndex(l => -1 !== l.name.indexOf('depth-spot'));
            this.assert(-1 !== groundLayerIndex, 'Ground layer must exist in map');
            this.assert(-1 !== spotLayerIndex, 'Depth spot layer must exist in map');
            this.assertEqual(spotLayerIndex, groundLayerIndex + 1, 'Depth spot layer must be positioned right after ground layer');
        });
    }

}

module.exports.TestSpotsGeneration = TestSpotsGeneration;
