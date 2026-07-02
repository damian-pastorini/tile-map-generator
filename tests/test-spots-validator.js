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

    buildSpotMap()
    {
        let safe = new Array(25).fill(0);
        safe[6] = 7;
        let path = new Array(25).fill(0);
        path[11] = 121;
        let layers = [];
        layers.push({name: 'safe-base', type: 'tilelayer', data: safe});
        layers.push({name: 'path', type: 'tilelayer', data: path});
        return {width: 5, height: 5, layers};
    }

    buildSafeBaseMap()
    {
        let layers = [];
        layers.push({name: 'safe-base', type: 'tilelayer', data: [7]});
        return {width: 1, height: 1, layers};
    }

    async testResolveSpotKeys()
    {
        await this.test('resolveSpotKeys lists the configured ground spot keys', async () => {
            let validator = new SpotsValidator();
            let keys = validator.resolveSpotKeys({groundSpots: {safe: {}, danger: {}}});
            this.assertEqual(keys.length, 2, 'Two spot keys expected');
            this.assert(-1 !== keys.indexOf('safe'), 'safe key expected');
            this.assertEqual(validator.resolveSpotKeys({}).length, 0, 'No spots without config');
        });
    }

    async testNoSpotsResult()
    {
        await this.test('noSpotsResult returns a passing result with the reason', async () => {
            let validator = new SpotsValidator();
            let result = validator.noSpotsResult('nothing here');
            this.assert(true === result.isValid, 'noSpotsResult should be valid');
            this.assertEqual(result.reason, 'nothing here', 'Reason should be carried through');
        });
    }

    async testFindSpotInMap()
    {
        await this.test('findSpotInMap returns the bounding box of a spot layer', async () => {
            let validator = new SpotsValidator();
            let location = validator.findSpotInMap(this.buildSpotMap(), 'safe');
            this.assert(null !== location, 'Spot should be located');
            this.assertEqual(location.x, 1, 'Spot x expected at 1');
            this.assertEqual(location.y, 1, 'Spot y expected at 1');
            this.assertEqual(location.width, 1, 'Spot width expected to be 1');
            this.assertEqual(location.height, 1, 'Spot height expected to be 1');
        });
    }

    async testFindSpotInMapNotFound()
    {
        await this.test('findSpotInMap returns null when no layer matches', async () => {
            let validator = new SpotsValidator();
            let result = validator.findSpotInMap({width: 4, height: 4, layers: []}, 'safe');
            this.assertEqual(result, null, 'Missing spot should return null');
        });
    }

    async testValidateLayerTileData()
    {
        await this.test('validateLayerTileData compares non-zero tile counts', async () => {
            let validator = new SpotsValidator();
            let okLayer = {name: 'safe-base', data: [0, 5, 5, 0]};
            let ok = validator.validateLayerTileData(okLayer, [0, 5, 5, 0], 'safe-base');
            this.assert(true === ok.isValid, 'Matching tile counts should be valid');
            let badLayer = {name: 'safe-base', data: [5]};
            let bad = validator.validateLayerTileData(badLayer, [5, 5], 'safe-base');
            this.assert(false === bad.isValid, 'Mismatched tile counts should fail');
            this.assertEqual(bad.violations[0].issue, 'tile-count-mismatch', 'Expected tile-count-mismatch issue');
            let notArray = validator.validateLayerTileData(okLayer, 'nope', 'safe-base');
            this.assertEqual(notArray.violations[0].issue, 'expected-tile-data-not-array', 'Expected non-array issue');
        });
    }

    async testValidateSpotTileTypesForSpot()
    {
        await this.test('validateSpotTileTypesForSpot validates each spot layer', async () => {
            let validator = new SpotsValidator();
            let okResult = validator.validateSpotTileTypesForSpot(this.buildSafeBaseMap(), 'safe', {spotLayers: {'safe-base': [7]}});
            this.assert(true === okResult.isValid, 'Matching spot layer should pass');
            let missing = validator.validateSpotTileTypesForSpot({layers: []}, 'safe', {spotLayers: {'safe-base': [7]}});
            this.assert(false === missing.isValid, 'Missing spot layer should fail');
            this.assertEqual(missing.violations[0].issue, 'spot-layer-not-found', 'Expected spot-layer-not-found issue');
        });
    }

    async testValidateSpotTileTypes()
    {
        await this.test('validateSpotTileTypes tallies correct spot layers', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {spotLayers: {'safe-base': [7]}}}};
            let result = validator.validateSpotTileTypes(this.buildSafeBaseMap(), config);
            this.assert(true === result.isValid, 'Matching spot tile types should pass');
            this.assertEqual(result.correctTileTypes, 1, 'One correct spot expected');
        });
    }

    async testValidateSpotQuantitiesMatch()
    {
        await this.test('validateSpotQuantities passes when the configured spot is present', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {quantity: 1, spotLayers: {'safe-base': [7]}}}};
            let result = validator.validateSpotQuantities(this.buildSpotMap(), config);
            this.assert(true === result.isValid, 'Present spot should pass');
            this.assertEqual(result.correctQuantities, 1, 'One correct quantity expected');
            this.assertEqual(result.totalFound, 1, 'One spot found expected');
        });
    }

    async testValidateSingleSpotConnectivityConnected()
    {
        await this.test('validateSingleSpotConnectivity reports a nearby path as connected', async () => {
            let validator = new SpotsValidator();
            let map = this.buildSpotMap();
            let pathLayer = validator.findLayerByName(map, 'path');
            let result = validator.validateSingleSpotConnectivity(map, 'safe', 121, pathLayer, 2);
            this.assert(true === result.isValid, 'Adjacent path should be connected');
            this.assertEqual(result.distance, 1, 'Distance of one expected');
        });
    }

    async testValidateSingleSpotConnectivityDisconnected()
    {
        await this.test('validateSingleSpotConnectivity fails when path is beyond max distance', async () => {
            let validator = new SpotsValidator();
            let map = this.buildSpotMap();
            let pathLayer = validator.findLayerByName(map, 'path');
            let result = validator.validateSingleSpotConnectivity(map, 'safe', 121, pathLayer, 0);
            this.assert(false === result.isValid, 'Distance beyond max should fail');
        });
    }

    async testValidateSpotConnectivitySuccess()
    {
        await this.test('validateSpotConnectivity passes for a path-adjacent spot', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {spotLayers: {'safe-base': [7]}}}, pathTile: 121};
            let result = validator.validateSpotConnectivity(this.buildSpotMap(), config, 2);
            this.assert(true === result.isValid, 'Connected spot should pass');
            this.assertEqual(result.connectedSpots, 1, 'One connected spot expected');
        });
    }

    async testValidateSpotConnectivityNoPathTile()
    {
        await this.test('validateSpotConnectivity passes when no path tile is configured', async () => {
            let validator = new SpotsValidator();
            let config = {groundSpots: {safe: {spotLayers: {'safe-base': [7]}}}, pathTile: 0};
            let result = validator.validateSpotConnectivity(this.buildSpotMap(), config, 2);
            this.assert(true === result.isValid, 'No path tile should pass');
            this.assertEqual(result.reason, 'No paths to validate connectivity', 'Expected no paths reason');
        });
    }

    async testValidateSpotConnectivityMissingPathLayerFails()
    {
        await this.test('validateSpotConnectivity fails when the path layer is absent', async () => {
            let validator = new SpotsValidator();
            let safe = new Array(25).fill(0);
            safe[6] = 7;
            let map = {width: 5, height: 5, layers: [{name: 'safe-base', type: 'tilelayer', data: safe}]};
            let config = {groundSpots: {safe: {spotLayers: {'safe-base': [7]}}}, pathTile: 121};
            let result = validator.validateSpotConnectivity(map, config, 2);
            this.assert(false === result.isValid, 'Missing path layer should fail');
            this.assertEqual(result.violations[0].issue, 'path-layer-not-found', 'Expected path-layer-not-found issue');
        });
    }

    async testPerformValidationStopsWithoutMaxDistance()
    {
        await this.test('performValidation stops at the connectivity step that needs a max distance', async () => {
            let validator = new SpotsValidator();
            let result = validator.performValidation({width: 4, height: 4, layers: []}, {groundSpots: {}});
            this.assert(false === result, 'Connectivity step without max distance makes the pipeline fail');
        });
    }

}

module.exports.TestSpotsValidator = TestSpotsValidator;
