const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file) {
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}
  }).outputText;
  const sandbox={exports:{},structuredClone,require: name => name.startsWith('.') ? load(require('node:path').resolve(require('node:path').dirname(file),name+'.ts')) : require(name)};vm.runInNewContext(compiled,sandbox);return sandbox.exports;
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

const { DEFAULT_CONFIG, normalizeConfig, STORAGE_KEY }=load('src/config.ts');
test('hours defaults clear the palms and migrate untouched saved positions without resetting edits',()=>{
  const saved=structuredClone(DEFAULT_CONFIG);
  const hours=saved.blocks.find(b=>b.id==='hours');
  hours.lines.forEach(line=>line.x=310);
  hours.lines[2].text='12pm-3pm';saved.groups[0].rows[0].value=24.99;
  const migrated=normalizeConfig(saved);
  assert.ok(migrated.blocks.find(b=>b.id==='hours').lines.every(l=>l.x-l.maxWidth/2>365));
  assert.equal(migrated.blocks.find(b=>b.id==='hours').lines[2].text,'12pm-3pm');
  assert.equal(migrated.groups[0].rows[0].value,24.99);
  assert.equal(STORAGE_KEY,'marhaba_board_config_v17');
  hours.offsetX=27;
  assert.equal(normalizeConfig(saved).blocks.find(b=>b.id==='hours').lines[0].x,310);
  hours.offsetX=0;hours.lines[0].x=600;
  assert.equal(normalizeConfig(saved).blocks.find(b=>b.id==='hours').lines[0].x,600);
});
test('cloud headings default on for existing boards and retain the saved choice',()=>{
  assert.equal(normalizeConfig({}).cloudHeadings,true);
  assert.equal(normalizeConfig({cloudHeadings:false}).cloudHeadings,false);
});
