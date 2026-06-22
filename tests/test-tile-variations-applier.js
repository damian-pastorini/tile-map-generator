/**
 *
 * Reldens - Test Tile Variations Applier
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { TileVariationsApplier } = require('../lib/map/tile-variations-applier');

class TestTileVariationsApplier extends BaseMapGeneratorTest
{

    async testReturnsEarlyWithoutVariations()
    {
        let layerData = new Array(16).fill(7);
        await this.test('applyTilesVariations returns early when no variation tiles', async () => {
            let applier = new TileVariationsApplier();
            let result = applier.applyTilesVariations(layerData, 4, 4, 16, [], 50);
            this.assert('undefined' === typeof result, 'Should return nothing when no variations');
            this.assertEqual(layerData.filter(tile => 7 === tile).length, 16, 'Layer data should remain unchanged');
        });
    }

    async testAppliesVariationsToLayerData()
    {
        let layerData = new Array(16).fill(0);
        let variations = [50, 51, 52];
        await this.test('applyTilesVariations changes some tiles to variation values', async () => {
            Math.random = this.seedRandom(12345);
            try {
                let applier = new TileVariationsApplier();
                let result = applier.applyTilesVariations(layerData, 4, 4, 16, variations, 50);
                this.assertEqual(result, layerData, 'Should return the same layer data array');
                let changed = layerData.filter(tile => 0 <= variations.indexOf(tile));
                this.assert(0 < changed.length, 'Some tiles should have been changed to variation values');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testRespectsPercentageCount()
    {
        let layerData = new Array(100).fill(0);
        let variations = [99];
        await this.test('applyTilesVariations changes at most the configured percentage', async () => {
            Math.random = this.seedRandom(54321);
            try {
                let applier = new TileVariationsApplier();
                applier.applyTilesVariations(layerData, 10, 10, 100, variations, 10);
                let changed = layerData.filter(tile => 99 === tile).length;
                this.assert(changed <= 10, 'Should not exceed the configured percentage of tiles');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testChecksTileValueOnReferenceLayer()
    {
        let referenceData = new Array(16).fill(5);
        let applyData = new Array(16).fill(0);
        let variations = [70];
        await this.test('applyTilesVariations only changes positions matching the checked value', async () => {
            Math.random = this.seedRandom(2024);
            try {
                let applier = new TileVariationsApplier();
                applier.applyTilesVariations(applyData, 4, 4, 16, variations, 100, referenceData, 9);
                let changed = applyData.filter(tile => 70 === tile).length;
                this.assertEqual(changed, 0, 'No tiles should change when reference value never matches');
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testZeroPercentageChangesNothing()
    {
        let layerData = new Array(16).fill(0);
        let variations = [60];
        await this.test('applyTilesVariations changes nothing when percentage is zero', async () => {
            let applier = new TileVariationsApplier();
            applier.applyTilesVariations(layerData, 4, 4, 16, variations, 0);
            this.assertEqual(layerData.filter(tile => 60 === tile).length, 0, 'No tiles should change at zero percent');
        });
    }

}

module.exports.TestTileVariationsApplier = TestTileVariationsApplier;
