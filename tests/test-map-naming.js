/**
 *
 * Reldens - Test Map Naming
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapNaming } = require('../lib/map/map-naming');
const { FileHandler } = require('@reldens/server-utils');

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

    async testIsFileNameAcceptsFileNames()
    {
        let naming = new MapNaming();
        await this.test('isFileName accepts the names without folders', async () => {
            this.assertEqual(naming.isFileName('town-001'), true, 'map name accepted');
            this.assertEqual(naming.isFileName('town-001.json'), true, 'map file name accepted');
            this.assertEqual(naming.isFileName('tilesheet.png'), true, 'tile sheet name accepted');
            this.assertEqual(naming.isFileName('town-001-house-010-n0'), true, 'sub map name accepted');
        });
    }

    async testIsFileNameRejectsFolders()
    {
        let naming = new MapNaming();
        await this.test('isFileName rejects the names pointing to another folder', async () => {
            let parentFolder = '..';
            this.assertEqual(
                naming.isFileName(FileHandler.joinPaths(parentFolder, 'outside')),
                false,
                'parent folder traversal rejected'
            );
            this.assertEqual(naming.isFileName(parentFolder), false, 'parent folder rejected');
            this.assertEqual(naming.isFileName('folder/map.json'), false, 'sub folder rejected');
            this.assertEqual(naming.isFileName('/tmp/map.json'), false, 'absolute path rejected');
            this.assertEqual(
                naming.isFileName('town/'+parentFolder+'/'+parentFolder+'/outside'),
                false,
                'inner traversal rejected'
            );
            this.assertEqual(naming.isFileName('%2e%2e%2foutside'), false, 'encoded traversal rejected');
        });
    }

    async testIsFileNameRejectsEmptyAndNonStrings()
    {
        let naming = new MapNaming();
        await this.test('isFileName rejects the empty and the non string names', async () => {
            this.assertEqual(naming.isFileName(''), false, 'empty name rejected');
            this.assertEqual(naming.isFileName(false), false, 'false rejected');
            this.assertEqual(naming.isFileName(null), false, 'null rejected');
            this.assertEqual(naming.isFileName(12), false, 'number rejected');
            this.assertEqual(naming.isFileName({}), false, 'object rejected');
        });
    }

}

module.exports.TestMapNaming = TestMapNaming;
