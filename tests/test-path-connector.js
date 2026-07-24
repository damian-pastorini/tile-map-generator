/**
 *
 * Reldens - Test Path Connector
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathConnector } = require('../lib/generator/path-connector');

class TestPathConnector extends BaseMapGeneratorTest
{

    buildPathConnector(generateElementsPath)
    {
        return new PathConnector({}, {}, {}, {}, {}, {}, {
            generateElementsPath: generateElementsPath,
            mainPathSize: 3,
            previousMainPath: [],
            pathSize: 1,
            isBorderWalkable: false,
            pathTile: 121,
            blockMapBorder: true,
            sortPositionsRelativeToTheMapCenter: true,
            applySurroundingPathTiles: false,
            splitBordersInLayers: false,
            applyPathsInnerWalls: false,
            pathsInnerWallsTilesKey: 'p',
            applyPathsOuterWalls: false,
            pathsOuterWallsTilesKey: 'p',
            cleanPathBorderTilesFromElements: false,
            allowPlacePathOverElementsFreeArea: false,
            collisionLayersForPaths: [],
            mapName: 'town-01',
            pathFinder: {},
            mapGridBuilder: {},
            bordersPatterns: {},
            tileShortcutsMapper: {},
            tilePositionCalculator: {},
            wallsGenerator: {}
        });
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected method and fields', async () => {
            let connector = this.buildPathConnector(true);
            this.assert(connector instanceof PathConnector, 'Expected PathConnector instance');
            this.assert('function' === typeof connector.connectPaths, 'Expected connectPaths method');
            this.assertEqual(connector.pathTile, 121);
            this.assertEqual(connector.mainPathSize, 3);
        });
    }

    async testConnectPathsReturnsFalseWhenDisabled()
    {
        await this.test('connectPaths returns false when generateElementsPath disabled', async () => {
            let connector = this.buildPathConnector(false);
            let result = await connector.connectPaths(4, 4, [], [], [], [], [], null, [], [], {});
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestPathConnector = TestPathConnector;
