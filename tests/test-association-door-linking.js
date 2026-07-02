/**
 *
 * Reldens - Test Association Door Linking
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { AssociatedMaps } = require('../lib/generator/associated-maps');
const { sc } = require('@reldens/utils');

class TestAssociationDoorLinking extends BaseMapGeneratorTest
{

    buildFusedChangePointsMap()
    {
        return {
            width: 4,
            height: 4,
            layers: [
                {
                    type: 'tilelayer',
                    name: 'town-001-house-010-change-points',
                    data: [0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    properties: [
                        {name: 'compositeFileNames', type: 'string', value: 'missing-interior-composite'}
                    ]
                }
            ]
        };
    }

    buildMainMapGeneratorStub()
    {
        return {
            mappedMapDataFromProvider: {},
            generatedChangePoints: {
                'town-001-house-01-n0': {
                    elementData: {name: 'house-01-change-points'},
                    targetLayerName: 'town-001-house-010-change-points',
                    elementNumber: 0,
                    tileIndex: 5,
                    mapIndex: 5,
                    x: 1,
                    y: 1
                }
            },
            fetchMapProperty: () => {
                return {value: ''};
            }
        };
    }

    async testChangePointLayerFoundByWrittenFusedName()
    {
        await this.test('Door change-point is matched by its written fused layer name so interiors can generate', async () => {
            let associatedMaps = new AssociatedMaps();
            let result = await associatedMaps.generate(
                this.buildFusedChangePointsMap(),
                'town-001',
                this.testDataFolder,
                {generateElementsPath: false, blockMapBorder: true},
                this.buildMainMapGeneratorStub()
            );
            this.assert(false !== result, 'generate must not early-return false; the fused change-points layer must be found');
            this.assert(sc.isObject(result), 'generate must return the generated sub-maps object once the door layer is matched');
        });
    }

    async testUnmatchedChangePointReturnsFalse()
    {
        await this.test('A change-point whose layer is absent returns false (control for the lookup)', async () => {
            let associatedMaps = new AssociatedMaps();
            let mainMapGenerator = this.buildMainMapGeneratorStub();
            mainMapGenerator.generatedChangePoints['town-001-house-01-n0'].targetLayerName = 'does-not-exist';
            let result = await associatedMaps.generate(
                this.buildFusedChangePointsMap(),
                'town-001',
                this.testDataFolder,
                {generateElementsPath: false},
                mainMapGenerator
            );
            this.assertEqual(false, result, 'When no layer matches the recorded name, generate returns false');
        });
    }

}

module.exports.TestAssociationDoorLinking = TestAssociationDoorLinking;
