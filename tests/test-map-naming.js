/**
 *
 * Reldens - Test Map Naming
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapNaming } = require('../lib/map/map-naming');

class TestMapNaming extends BaseMapGeneratorTest
{

    async testFuseGroupName()
    {
        let naming = new MapNaming();
        await this.test('fuseGroupName joins the first two parts with a dash', async () => {
            this.assertEqual(naming.fuseGroupName(['house', '01']), 'house-01', 'parts joined with dash');
            this.assertEqual(naming.fuseGroupName(['tree', 'base']), 'tree-base', 'second example joined');
        });
    }

    async testBuildFloorSuffix()
    {
        let naming = new MapNaming();
        await this.test('buildFloorSuffix builds the floor suffix string', async () => {
            this.assertEqual(naming.buildFloorSuffix('up', 2), '-upFloor-n2', 'suffix combines key and number');
            this.assertEqual(naming.buildFloorSuffix('down', 0), '-downFloor-n0', 'suffix supports zero number');
        });
    }

    async testStripJsonExtension()
    {
        let naming = new MapNaming();
        await this.test('stripJsonExtension removes the json extension', async () => {
            this.assertEqual(naming.stripJsonExtension('map.json'), 'map', 'extension removed');
            this.assertEqual(naming.stripJsonExtension('plain'), 'plain', 'name without extension unchanged');
        });
    }

    async testEnsureJsonExtension()
    {
        let naming = new MapNaming();
        await this.test('ensureJsonExtension appends json only when missing', async () => {
            this.assertEqual(naming.ensureJsonExtension('map'), 'map.json', 'extension appended when missing');
            this.assertEqual(naming.ensureJsonExtension('map.json'), 'map.json', 'existing extension kept');
        });
    }

    async testToFileNames()
    {
        let naming = new MapNaming();
        await this.test('toJsonFileName and toPngFileName append the proper suffix', async () => {
            this.assertEqual(naming.toJsonFileName('town'), 'town.json', 'json suffix appended');
            this.assertEqual(naming.toPngFileName('town'), 'town.png', 'png suffix appended');
        });
    }

}

module.exports.TestMapNaming = TestMapNaming;
