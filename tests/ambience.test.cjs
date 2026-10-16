const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(readFileSync('src/ambience.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const sandbox = { exports: {}, Intl };
vm.runInNewContext(compiled, sandbox);
const { atmosphereAtHour, restaurantHour, nightInk } = sandbox.exports;
test('Minneapolis clock handles daylight saving independently of device timezone', () => {
  assert.equal(restaurantHour(new Date('2026-07-01T17:30:00Z')), 12.5);
  assert.equal(restaurantHour(new Date('2026-01-01T18:30:00Z')), 12.5);
  assert.equal(restaurantHour(new Date('2026-10-16T05:00:00Z')), 0);
});
test('lighting stays bounded and continuous through midnight and scene boundaries', () => {
  for (let h=0; h<24; h+=1/60) {
    const a=atmosphereAtHour(h), b=atmosphereAtHour(h+1/60);
    for (const key of Object.keys(a)) {
      assert.ok(Number.isFinite(a[key]) && a[key]>=0 && a[key]<=1.2);
      assert.ok(Math.abs(a[key]-b[key])<0.02);
    }
  }
  assert.equal(atmosphereAtHour(24).night,atmosphereAtHour(0).night);
  assert.equal(atmosphereAtHour(12).night,0);
  assert.equal(atmosphereAtHour(23).night,1);
});
test('night readability preserves custom label colors', () => {
  assert.equal(nightInk('#2c2c2c',1),'rgb(244,239,225)');
  assert.equal(nightInk('#ff0000',1),'#ff0000');
});
