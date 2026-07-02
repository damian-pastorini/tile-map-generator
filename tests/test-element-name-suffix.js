/**
 *
 * Reldens - Test Element Name Suffix
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementNameSuffix } = require('../lib/map/element-name-suffix');

class TestElementNameSuffix extends BaseMapGeneratorTest
{

    async testPadNum()
    {
        await this.test('padNum pads to width 3 with leading zeros', async () => {
            this.assertEqual(ElementNameSuffix.padNum(1), '001');
            this.assertEqual(ElementNameSuffix.padNum(42), '042');
            this.assertEqual(ElementNameSuffix.padNum(999), '999');
            this.assertEqual(ElementNameSuffix.padNum(1000), '1000');
        });
    }

    async testMaxSuffix()
    {
        await this.test('maxSuffix returns the highest suffix for the given base', async () => {
            let names = ['tree-001', 'tree-007', 'tree-003', 'rock-010'];
            this.assertEqual(ElementNameSuffix.maxSuffix(names, 'tree'), 7);
            this.assertEqual(ElementNameSuffix.maxSuffix(names, 'rock'), 10);
            this.assertEqual(ElementNameSuffix.maxSuffix(names, 'flower'), 0);
            this.assertEqual(ElementNameSuffix.maxSuffix([], 'tree'), 0);
        });
    }

    async testMaxSuffixIgnoresNonNumeric()
    {
        await this.test('maxSuffix skips names with non-numeric suffix', async () => {
            let names = ['tree-abc', 'tree-001', 'tree-xyz', 'tree-005'];
            this.assertEqual(ElementNameSuffix.maxSuffix(names, 'tree'), 5);
        });
    }

    async testNextSuffix()
    {
        await this.test('nextSuffix returns padded next-id string', async () => {
            this.assertEqual(ElementNameSuffix.nextSuffix(['tree-001', 'tree-002'], 'tree'), 'tree-003');
            this.assertEqual(ElementNameSuffix.nextSuffix([], 'tree'), 'tree-001');
            this.assertEqual(ElementNameSuffix.nextSuffix(['rock-010'], 'rock'), 'rock-011');
        });
    }

    async testParseSuffix()
    {
        await this.test('parseSuffix extracts the numeric tail', async () => {
            this.assertEqual(ElementNameSuffix.parseSuffix('tree-042'), 42);
            this.assertEqual(ElementNameSuffix.parseSuffix('rock-007'), 7);
            this.assertEqual(ElementNameSuffix.parseSuffix('no-suffix-here'), 0);
        });
    }

    async testSplitInstanceId()
    {
        await this.test('splitInstanceId returns base + index pair', async () => {
            let split = ElementNameSuffix.splitInstanceId('tree-042');
            this.assertEqual(split.base, 'tree');
            this.assertEqual(split.index, 42);
            let multi = ElementNameSuffix.splitInstanceId('big-rock-007');
            this.assertEqual(multi.base, 'big-rock');
            this.assertEqual(multi.index, 7);
            let unmatched = ElementNameSuffix.splitInstanceId('plain');
            this.assertEqual(unmatched.base, 'plain');
            this.assertEqual(unmatched.index, 0);
        });
    }

    async testResolveUniqueReturnsSameWhenFree()
    {
        await this.test('resolveUnique returns the same name when not taken', async () => {
            this.assertEqual(ElementNameSuffix.resolveUnique(['tree-001'], 'flower'), 'flower');
        });
    }

    async testResolveUniqueAppendsSuffixWhenTaken()
    {
        await this.test('resolveUnique appends padded suffix when name is taken', async () => {
            let existing = ['tree', 'tree-001', 'tree-002'];
            this.assertEqual(ElementNameSuffix.resolveUnique(existing, 'tree'), 'tree-003');
        });
    }

    async testResolveUniqueStartsAtTwoWithoutNumberedSiblings()
    {
        await this.test('resolveUnique starts at -002 when the bare name is taken but has no numbered siblings', async () => {
            this.assertEqual(ElementNameSuffix.resolveUnique(['tree'], 'tree'), 'tree-002');
        });
    }
}

module.exports.TestElementNameSuffix = TestElementNameSuffix;
