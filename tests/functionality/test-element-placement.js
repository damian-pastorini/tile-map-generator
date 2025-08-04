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
        await this.testWithDeterministicSeed(
            'Element position validation',
            config,
            54321,
            async (map, config, generator) => {
                let positionValidation = this.elementPlacementValidator.validateElementPositions(map, config);
                this.assert(positionValidation.isValid, 'All element positions must be valid');
            }
        );
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
