/**
 *
 * Reldens - Test Spots Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotsValidator } = require('../lib/validator/spots-validator');

class TestSpotsValidator extends BaseMapGeneratorTest
{

    async testNoSpotsConfiguredPasses()
    {
        await this.test('No groundSpots passes spot dimensions validation', async () => {
            let validator = new SpotsValidator();
            let result = validator.validateSpotDimensions({width: 4, height: 4, layers: []}, {groundSpots: {}});
            this.assert(true === result.isValid, 'No spots configured should pass');
            this.assertEqual(result.reason, 'No spots configured', 'Expected no spots reason');
        });
    }

    async testValidSpotDimensionsPasses()
    {
        await this.test('Spot config with positive dimensions passes', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {width: 2, height: 2, spotLayers: {'safe-base': []}}}};
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateSpotDimensions(map, config);
            this.assert(true === result.isValid, 'Valid spot dimensions should pass');
            this.assertEqual(result.validDimensions, 1, 'One valid spot expected');
        });
    }

    async testInvalidSpotDimensionsFails()
    {
        await this.test('Spot config with zero width fails', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {width: 0, height: 2, spotLayers: {'safe-base': []}}}};
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateSpotDimensions(map, config);
            this.assert(false === result.isValid, 'Zero width spot should fail');
            this.assertEqual(result.invalidDimensions, 1, 'One invalid spot expected');
        });
    }

    async testSpotMissingLayersFails()
    {
        await this.test('Spot without layer definitions fails dimensions validation', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {width: 2, height: 2, spotLayers: {}}}};
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateSpotDimensions(map, config);
            this.assert(false === result.isValid, 'Missing layer definitions should fail');
        });
    }

    async testSpotConnectivityRequiresMaxDistance()
    {
        await this.test('Spot connectivity requires maxAcceptableDistance parameter', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {width: 2, height: 2, spotLayers: {'safe-base': []}}}, pathTile: 121};
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateSpotConnectivity(map, config);
            this.assert(false === result.isValid, 'Missing maxAcceptableDistance should fail');
            this.assertEqual(
                result.reason,
                'maxAcceptableDistance parameter is required',
                'Expected maxAcceptableDistance required reason'
            );
        });
    }

    async testSpotQuantitiesMissingSpotFails()
    {
        await this.test('Configured spot absent from map fails quantity validation', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {width: 2, height: 2, quantity: 1, spotLayers: {'safe-base': []}}}};
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateSpotQuantities(map, config);
            this.assert(false === result.isValid, 'Missing spot should fail');
            this.assertEqual(result.totalFound, 0, 'No spots found expected');
        });
    }

}

module.exports.TestSpotsValidator = TestSpotsValidator;
