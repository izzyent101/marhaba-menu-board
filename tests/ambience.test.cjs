const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file) {
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}
  }).outputText;
  const sandbox={exports:{},require};vm.runInNewContext(compiled,sandbox);return sandbox.exports;
}
const { nightInk }=load('src/ambience.ts');
const { solarScene }=load('src/solar.ts');
test('Minneapolis solar clock follows seasonal daylight independently of computer timezone',()=>{
  const summer=solarScene('auto',new Date('2026-06-21T01:00:00Z'));
  const winter=solarScene('auto',new Date('2026-12-21T02:00:00Z'));
  assert.ok(summer.altitude>0,'8pm summer still has sunlight');
  assert.ok(winter.altitude<0,'8pm winter is dark');
  assert.ok(summer.night<winter.night);
});
test('scene is continuous across dates and the daylight saving clock change',()=>{
  for(const iso of ['2026-10-16T05:00:00Z','2026-11-01T07:00:00Z']) {
    const t=new Date(iso).getTime();
    const a=solarScene('auto',new Date(t-1000)),b=solarScene('auto',new Date(t+1000));
    assert.ok(Math.abs(a.altitude-b.altitude)<0.001);
    assert.ok(Math.abs(a.night-b.night)<0.001);
  }
});
test('sun is above horizon during day and below horizon during night, without night stars at noon',()=>{
  assert.ok(solarScene('day').altitude>0);assert.equal(solarScene('day').night,0);
  assert.ok(solarScene('night').altitude<0);assert.equal(solarScene('night').night,1);
  for(const mode of ['auto','day','night','sunset','dawn']){
    const state=solarScene(mode);for(const value of Object.values(state))assert.ok(Number.isFinite(value));
    assert.ok(state.moonPhase>=0&&state.moonPhase<=1);
  }
});
test('night readability preserves custom label colors',()=>{
  assert.equal(nightInk('#2c2c2c',1),'rgb(244,239,225)');
  assert.equal(nightInk('#ff0000',1),'#ff0000');
});
