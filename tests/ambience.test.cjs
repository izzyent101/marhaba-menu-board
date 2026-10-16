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
const { solarScene,sceneLighting,sunTransmittance,solarPreviewWindow }=load('src/solar.ts');
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
  assert.ok(migrated.blocks.find(b=>b.id==='hours').lines.every(l=>l.x-l.maxWidth/2>48));
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

test('legacy hours move fully into open sky and retain edited text and prices',()=>{
  const saved=structuredClone(DEFAULT_CONFIG),hours=saved.blocks.find(b=>b.id==='hours');
  const legacy=[54,112,170,228,286,344,402,460];
  hours.lines.forEach((line,index)=>{line.x=545;line.baseline=legacy[index]});
  hours.lines[2].text='12pm-3pm';saved.groups[0].rows[0].value=27.25;
  const next=normalizeConfig(saved),moved=next.blocks.find(b=>b.id==='hours');
  assert.ok(moved.lines.every(line=>line.x===210));
  assert.ok(moved.lines.every(line=>96+line.baseline*(984/1080)<440));
  assert.equal(moved.lines[2].text,'12pm-3pm');assert.equal(next.groups[0].rows[0].value,27.25);
  hours.lines[0].baseline=80;
  assert.equal(normalizeConfig(saved).blocks.find(b=>b.id==='hours').lines[0].baseline,80);
});

test('direct sunlight reddens near the horizon and vanishes at night',()=>{
  const noon=sunTransmittance(48*Math.PI/180),low=sunTransmittance(1*Math.PI/180);
  assert.ok(low[0]/Math.max(low[2],1e-10)>noon[0]/noon[2]*5);
  assert.ok(noon.every((value,index)=>value>low[index]));
  assert.deepEqual(Array.from(sunTransmittance(-.2)),[0,0,0]);
  for(const altitude of [-.2,-.012,-.011,0,.017,.3,1]){
    const light=sceneLighting({...solarScene('day'),altitude});
    assert.ok(Object.values(light).flat().every(Number.isFinite));
    assert.ok(light.direct>=0&&light.direct<=1);
  }
});
test('a full solar day changes light continuously through both twilights',()=>{
  const window=solarPreviewWindow(new Date('2026-10-16T17:00:00Z'));
  let previous=null,min=Infinity,max=-Infinity;
  for(let time=window.start;time<=window.end;time+=1000){
    const scene=solarScene('auto',new Date(time)),light=sceneLighting(scene);
    min=Math.min(min,scene.altitude);max=Math.max(max,scene.altitude);
    if(previous){
      assert.ok(Math.abs(light.direct-previous.direct)<.002,'no preset switch or light jump');
      assert.ok(Math.abs(light.ambient-previous.ambient)<.002,'sky ambient stays continuous');
      assert.ok(Math.abs(light.moonLight-previous.moonLight)<.002,'moonlight stays continuous');
    }
    previous=light;
  }
  assert.ok(min<-.25&&max>.5,'preview includes deep night and daytime');
  const rising=solarScene('auto',new Date(window.start+4*3600000));
  const setting=solarScene('auto',new Date(window.end-4*3600000));
  assert.ok(rising.azimuth<0&&setting.azimuth>0,'morning and evening light come from opposite sides');
});
test('night labels fade continuously and retain custom colors',()=>{
  const values=[.1,.12,.14,.16,.18,.20,.22,.24,.26,.27].map(value=>Number(nightInk('#2c2c2c',value).match(/\d+/)[0]));
  assert.ok(values.every((value,index)=>index===0||value>=values[index-1]));
  assert.ok(values.every((value,index)=>index===0||value-values[index-1]<40),'no abrupt ink swap');
  assert.equal(nightInk('#008844',.2),'#008844');
});
