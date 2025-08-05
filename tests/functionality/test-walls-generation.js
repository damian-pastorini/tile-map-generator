/**
 *
 * Reldens - Test Walls Generation
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { WallsValidator } = require('../../lib/validator/walls-validator');

class TestWallsGeneration extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.wallsValidator = new WallsValidator();
    }

    setupWallConfig()
    {
        let testDataFolder = this.testDataFolder;
        let compositePath = testDataFolder+'/reldens-town-composite.json';
        if(!require('@reldens/server-utils').FileHandler.exists(compositePath)){
            let config = this.setupBasicConfig();
            config.groundSpots = {
                'wall-test-spot': {
                    quantity: 1,
                    width: 5,
                    height: 5,
                    walkable: false,
                    layerName: 'ground-spot-wall-test',
                    tilesKey: 'wall-test-spot',
                    spotTile: 116,
                    borderInnerWalls: true,
                    borderOuterWalls: true,
                    applyCornersTiles: true
                }
            };
            config.applyPathsInnerWalls = true;
            config.applyPathsOuterWalls = true;
            config.freeSpaceTilesQuantity = 3;
            return config;
        }
        let tileMapJSON = JSON.parse(require('@reldens/server-utils').FileHandler.readFile(compositePath));
        return {
            tileMapJSON,
            rootFolder: testDataFolder,
            factor: 1,
            elementsQuantity: {'house-01': 1, 'tree-base': 1}
        };
    }

    async testInnerWallsPlacement()
    {
        let config = this.setupWallConfig();
        await this.testWithDeterministicSeed('Inner walls placement', config, 13579, async (map, config) => {
            let validation = this.wallsValidator.validateInnerWallPlacement(map, config);
            this.logFunctionalityResult('Inner Walls Placement', validation);
            this.assert(validation.isValid, 'Inner walls must be placed correctly');
        });
    }

    async testOuterWallsPlacement()
    {
        let config = this.setupWallConfig();
        await this.testWithDeterministicSeed('Outer walls placement', config, 24680, async (map, config) => {
            let validation = this.wallsValidator.validateOuterWallPlacement(map, config);
            this.logFunctionalityResult('Outer Walls Placement', validation);
            this.assert(validation.isValid, 'Outer walls must be placed correctly');
        });
    }

    async testWallTileTypesCorrect()
    {
        let config = this.setupWallConfig();
        await this.testWithDeterministicSeed('Wall tile types correct', config, 97531, async (map, config) => {
            let validation = this.wallsValidator.validateWallTileTypes(map, config);
            this.logFunctionalityResult('Wall Tile Types', validation);
            this.assert(validation.isValid, 'Wall tile types must match configuration');
        });
    }

    async testCornerTilePlacement()
    {
        let config = this.setupWallConfig();
        await this.testWithDeterministicSeed('Corner tile placement', config, 86420, async (map, config) => {
            let validation = this.wallsValidator.validateCornerTilePlacement(map, config);
            this.logFunctionalityResult('Corner Tile Placement', validation);
            this.assert(validation.isValid, 'Corner tiles must be placed correctly');
        });
    }

}

module.exports.TestWallsGeneration = TestWallsGeneration;
