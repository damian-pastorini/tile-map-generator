/**
 *
 * Reldens - Test Path Connector
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathConnector } = require('../lib/generator/path-connector');
const { PathRouter } = require('../lib/generator/path-router');
const { PathFinder } = require('../lib/path-finder/path-finder');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestPathConnector extends BaseMapGeneratorTest
{

    buildPathConnector(generateElementsPath, pathRouter, layerDataFactory)
    {
        return new PathConnector(pathRouter || {}, {}, {}, {}, layerDataFactory || {}, {}, {
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
            let result = await connector.connectPaths(4, 4, [], [], [], [], [], null, [], [], {}, null);
            this.assertEqual(result, false);
        });
    }

    async testConnectExitMainPathRoutesTheExitToTheEntry()
    {
        await this.test('connectExitMainPath paints the route from the exit start to the entry start', async () => {
            let pathFinder = new PathFinder();
            let connector = this.buildPathConnector(
                true,
                new PathRouter(pathFinder, new GeometryCalculator()),
                new LayerDataFactory()
            );
            let grid = pathFinder.create(5, 5);
            let pathLayerData = Array(25).fill(0);
            let allPathsPoints = [];
            let connected = connector.connectExitMainPath(
                {x: 1, y: 1},
                {x: 3, y: 1},
                grid,
                pathLayerData,
                5,
                allPathsPoints
            );
            this.assertEqual(connected, true, 'The exit start must be connected to the entry start');
            this.assertDeepEqual(allPathsPoints, [[1, 1], [2, 1], [3, 1]], 'The routed points are collected');
            let expectedPathLayerData = Array(25).fill(0);
            expectedPathLayerData[6] = 121;
            expectedPathLayerData[7] = 121;
            expectedPathLayerData[8] = 121;
            this.assertDeepEqual(pathLayerData, expectedPathLayerData, 'The route is painted with the path tile');
        });
    }

    async testConnectExitMainPathWithoutExit()
    {
        await this.test('connectExitMainPath does nothing when the map has no exit main path', async () => {
            let connector = this.buildPathConnector(true);
            let pathLayerData = Array(25).fill(0);
            let connected = connector.connectExitMainPath(false, {x: 3, y: 1}, {}, pathLayerData, 5, []);
            this.assertEqual(connected, false, 'Nothing is connected without an exit start');
            this.assertDeepEqual(pathLayerData, Array(25).fill(0), 'Nothing is painted');
        });
    }

}

module.exports.TestPathConnector = TestPathConnector;
