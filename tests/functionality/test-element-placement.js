/**
 *
 * Reldens - Element Placement Test
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { ElementPlacementValidator } = require('../../lib/validator/element-placement-validator');

class TestElementPlacement extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.elementPlacementValidator = new ElementPlacementValidator();
    }

    async testElementQuantityAccuracy()
    {
        let config = this.setupComplexConfig();
        config.elementsQuantity = {house1: 1, tree: 1};
        config.mapSize = {mapWidth: 40, mapHeight: 40};
        config.freeSpaceTilesQuantity = 5;
        config.elementsFreeSpaceAround = {house1: 3, tree: 3};
        await this.testWithDeterministicSeed(
            'Element quantity exact match',
            config,
            12345,
            async (map, config, generator) => {
                let quantityValidation = this.elementPlacementValidator.validateElementQuantities(
                    map,
                    config,
                    generator
                );
                this.assert(
                    quantityValidation.isValid,
                    'Element quantities must match configuration exactly'
                );
            }
        );
    }

    async testElementPositionValidation()
    {
        let config = this.setupComplexConfig();
        config.elementsQuantity = {house1: 1, tree: 1};
        config.mapSize = {mapWidth: 50, mapHeight: 50};
        config.freeSpaceTilesQuantity = 8;
        await this.testWithDeterministicSeed(
            'Element position validation',
            config,
            54321,
            async (map, config, generator) => {
                let elementsQuantity = config.elementsQuantity;
                let elementTypes = Object.keys(elementsQuantity);
                let foundElements = 0;
                for(let elementType of elementTypes){
                    let elementLayers = map.layers.filter(layer => -1 !== layer.name.indexOf(elementType));
                    if(0 < elementLayers.length){
                        foundElements++;
                    }
                }
                this.assert(foundElements > 0, 'At least some elements must be placed');
                this.assert(foundElements <= elementTypes.length, 'No more elements than configured should be found');
            }
        );
    }

    buildSizedConfig(mapName, mapSize, elementsQuantity, freeSpaceTilesQuantity)
    {
        let config = this.setupComplexConfig();
        config.mapName = mapName;
        config.mapFileName = mapName+'.json';
        config.elementsQuantity = elementsQuantity;
        config.mapSize = mapSize;
        config.freeSpaceTilesQuantity = freeSpaceTilesQuantity;
        return config;
    }

    async testMapSizeStaysUntouchedWhenTheElementsFit()
    {
        let config = this.buildSizedConfig(
            'auto-grow-not-needed',
            {mapWidth: 40, mapHeight: 40},
            {house1: 1, tree: 1},
            2
        );
        let testName = 'an explicit mapSize is never touched when every element fits';
        await this.testWithDeterministicSeed(testName, config, 12345, async (map) => {
            this.assertEqual(map.width, 40, 'the width must stay exactly as configured');
            this.assertEqual(map.height, 40, 'the height must stay as configured, any change means the map grew');
        });
    }

    async testMapSizeStaysUntouchedWithTheInOrderPlacement()
    {
        let config = this.buildSizedConfig(
            'auto-grow-not-needed-in-order',
            {mapWidth: 40, mapHeight: 40},
            {house1: 1, tree: 1},
            2
        );
        config.placeElementsOrder = 'inOrder';
        config.orderElementsBySize = false;
        let testName = 'the inOrder placement fills from the top left without growing the map';
        await this.testWithDeterministicSeed(testName, config, 12345, async (map) => {
            this.assertEqual(map.width, 40, 'the width must stay exactly as configured');
            this.assertEqual(map.height, 40, 'the inOrder scan is exhaustive, so a fitting map must never grow');
        });
    }

    async testTheMapGrowsOnTheBottomOnlyWhenAnElementDoesNotFit()
    {
        let config = this.setupComplexConfig();
        config.mapName = 'auto-grow-needed';
        config.mapFileName = 'auto-grow-needed.json';
        config.elementsQuantity = {house1: 4, tree: 4};
        config.mapSize = {mapWidth: 18, mapHeight: 18};
        config.freeSpaceTilesQuantity = 3;
        config.elementsFreeSpaceAround = {house1: 3, tree: 3};
        let testName = 'a map too small for its elements grows on the bottom only';
        await this.testWithDeterministicSeed(testName, config, 12345, async (map) => {
            this.assertEqual(map.width, 18, 'auto grow must never change the width, the row stride must hold');
            this.assert(18 < map.height, 'the map must have grown taller to fit the rejected element');
        });
    }

    async testElementBoundaryValidation()
    {
        let config = this.setupComplexConfig();
        config.elementsQuantity = {house1: 1};
        await this.testWithDeterministicSeed(
            'Element boundary validation',
            config,
            98765,
            async (map, config, generator) => {
                let boundaryValidation = this.elementPlacementValidator.validateElementBoundaries(map, config);
                this.assert(boundaryValidation.isValid, 'All elements must be within map boundaries');
            }
        );
    }

    async testElementOverlapValidation()
    {
        let config = this.setupComplexConfig();
        config.elementsQuantity = {house1: 1, tree: 1};
        await this.testWithDeterministicSeed(
            'Element overlap validation',
            config,
            11111,
            async (map, config, generator) => {
                let overlapValidation = this.elementPlacementValidator.validateElementOverlaps(map, config);
                this.assert(overlapValidation.isValid, 'No element overlaps allowed');
            }
        );
    }

    async testMultipleElementTypes()
    {
        let config = this.setupComplexConfig();
        config.freeSpaceTilesQuantity = 5;
        await this.testWithDeterministicSeed(
            'Multiple element types validation',
            config,
            22222,
            async (map, config, generator) => {
                let quantityValidation = this.elementPlacementValidator.validateElementQuantities(
                    map,
                    config,
                    generator
                );
                this.assert(quantityValidation.isValid, 'All element type quantities must match');
            }
        );
    }

}

module.exports.TestElementPlacement = TestElementPlacement;
