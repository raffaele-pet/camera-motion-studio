// Run with: node --test tests/camera-library.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const fn = name => {
  const match = script.match(new RegExp(`function ${name}\\([^]*?\\n}`));
  assert.ok(match, `Missing function ${name}`);
  return match[0];
};
function setup() {
  const nodes = new Map();
  const presets = [];
  const library = {innerHTML:''};
  const context = vm.createContext({
    nodes, presets, library,
    document:{},
    $:selector=>selector==='#cameraPresets'?library:null,
    $$:selector=>selector==='.camera-preset'?presets:[],
    state:{duration:10,pps:90,tracks:3,clips:[],sources:[],currentTime:0,snap:true},
    MIN_CLIP:.05,SNAP_EDGE_PX:10,SNAP_GRID_PX:3.5,
    clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
    uid:()=>String(Math.random()), DEFAULT_MANUAL:()=>({}),DEFAULT_FUSION:1,
    pushHistory:()=>{},renderTimeline:()=>{},renderInspector:()=>{},
    setTime:()=>{},scrollClipIntoView:()=>{},toast:()=>{},entryTransitionKey:c=>`entry:${c.id}`,
  });
  vm.runInContext(script.slice(script.indexOf('const MOTIONS ='),script.indexOf('const DEFAULT_MANUAL=')),context);
  for (const name of ['timelineSnapCandidates','snapThresholdSeconds','snapClipMove','cameraLayerOverlaps','nearestFreeCameraStart','newCameraDropPlacement','bindAdjustmentDropLane','addClip']) {
    vm.runInContext(fn(name),context);
  }
  vm.runInContext(script.match(/function defaultClip\([^\n]+/)[0],context);
  context.state.transitions={};
  return {context,run:code=>vm.runInContext(code,context)};
}
function element() {
  const events = {};
  const classes = new Set();
  return {events,dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
    addEventListener:(name,handler)=>events[name]=handler,
    contains:()=>false,getBoundingClientRect:()=>({left:418})};
}
function transfer() {
  const data = {};
  return {get types(){return Object.keys(data)},setData:(type,value)=>data[type]=value,getData:type=>data[type]||''};
}
test('the complete application module parses',()=>{
  new vm.Script(script.replace(/^import .*;$/gm,''));
});
test('all 17 presets carry their motion through drag/drop into the Inspector selection',()=>{
  const {context,run} = setup();
  const types = run('Object.keys(MOTION_ICONS)');
  assert.equal(types.length,17);
  for (const type of types) {
    const preset = element(); preset.dataset.motion=type; context.presets.push(preset);
  }
  run('renderCameraLibrary()');
  assert.equal((context.library.innerHTML.match(/class="camera-group"/g)||[]).length,5);
  for (const preset of context.presets) {
    context.state.clips=[]; context.state.duration=10;
    const dataTransfer = transfer();
    preset.events.dragstart({dataTransfer});
    assert.equal(dataTransfer.effectAllowed,'copy');
    const lane = element(); context.lane=lane;
    run('bindAdjustmentDropLane(lane,1)');
    let prevented=false;
    lane.events.dragover({dataTransfer,preventDefault:()=>prevented=true});
    assert.equal(prevented,true);
    assert.equal(dataTransfer.dropEffect,'copy');
    lane.events.drop({dataTransfer,clientX:553,preventDefault:()=>{}});
    const clip=context.state.clips[0];
    assert.equal(clip.type,preset.dataset.motion);
    assert.equal(clip.track,1);
    assert.equal(clip.start,1.5);
    assert.equal(clip.duration,2);
    assert.equal(clip.intensity,100);
    assert.equal(context.state.selectedId,clip.id);
    preset.events.dragend();
  }
});
test('invalid drop payloads cannot create camera layers',()=>{
  const {context,run}=setup(),lane=element(); context.lane=lane;run('bindAdjustmentDropLane(lane,0)');
  for(const payload of ['none','1','unknown','__proto__']){
    const dataTransfer=transfer(); dataTransfer.setData('application/x-camera-adjustment',payload);
    lane.events.drop({dataTransfer,clientX:500,preventDefault:()=>{}});
  }
  assert.equal(context.state.clips.length,0);
});
test('camera drops retain non-overlap, forward tie, snapping and timeline extension rules',()=>{
  const {context,run}=setup();
  context.state.clips=[{id:'a',track:0,start:2,duration:2}];
  assert.equal(run('newCameraDropPlacement(0,2,2).start'),4);
  assert.equal(run('newCameraDropPlacement(0,.5,2).start'),0);
  assert.equal(run('newCameraDropPlacement(1,2,2).start'),2);
  assert.equal(run('newCameraDropPlacement(0,4.04,2).start'),4);
  context.state.snap=false;
  assert.equal(run('newCameraDropPlacement(0,4.04,2).start'),4.04);
  run("addClip('orbitUp',2,12.5)");
  assert.equal(context.state.duration,14.5);
  assert.equal(context.state.clips.at(-1).duration,2);
});
test('every selected icon is present in the locally bundled SVG sprite',()=>{
  const {run}=setup();
  const sprite=fs.readFileSync(path.join(__dirname,'..','assets','camera-icons.svg'),'utf8');
  for(const [icon] of run('Object.values(MOTION_ICONS)'))assert.ok(sprite.includes(`id="${icon}"`),icon);
});
