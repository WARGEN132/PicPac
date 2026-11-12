import test from 'node:test';
import assert from 'node:assert/strict';
import { getPhotoAnalyzer } from './index';

test('picPac.by PhotoAnalyzer AI Layer Contract', async (t) => {
  const analyzer = getPhotoAnalyzer();

  await t.test('analyzer is initialized and provides required interface methods', () => {
    assert.ok(analyzer, 'Analyzer instance must be created');
    assert.equal(typeof analyzer.scoreQuality, 'function');
    assert.equal(typeof analyzer.findDuplicates, 'function');
    assert.equal(typeof analyzer.pickBest, 'function');
    assert.equal(typeof analyzer.suggestLayout, 'function');
    assert.equal(typeof analyzer.describe, 'function');
  });

  await t.test('scoreQuality evaluates low resolution and produces warnings', async () => {
    const lowResPhoto = { id: 'p1', width: 800, height: 600 };
    const resLow = await analyzer.scoreQuality(lowResPhoto);
    assert.equal(resLow.isLowResolution, true);
    assert.ok(resLow.warnings.length > 0);

    const highResPhoto = { id: 'p2', width: 3000, height: 2000 };
    const resHigh = await analyzer.scoreQuality(highResPhoto);
    assert.equal(resHigh.isLowResolution, false);
    assert.ok(resHigh.score >= 90);
  });

  await t.test('suggestLayout populates slots for product requirements', async () => {
    const photos = [
      { id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }
    ];
    const product = { id: 'prod-photobook-premium', minPhotos: 2, maxPhotos: 10 };
    const layout = await analyzer.suggestLayout(photos, product);

    assert.equal(layout.productId, product.id);
    assert.equal(layout.slots.length, 4);
    assert.ok(layout.tips.length > 0);
  });
});
