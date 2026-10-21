const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const defaultLoader=html.match(/async function loadDefaultModel\([^]*?\n}/)[0];
const model=fs.readFileSync(path.join(root,'assets','models','Fox.glb'));

test('the bundled GLB is complete and includes all three Fox animations',()=>{
  assert.equal(model.toString('ascii',0,4),'glTF');
  assert.equal(model.readUInt32LE(4),2);
  assert.equal(model.readUInt32LE(8),model.length);
  assert.equal(model.readUInt32LE(16),0x4e4f534a);
  const gltf=JSON.parse(model.toString('utf8',20,20+model.readUInt32LE(12)));
  assert.deepEqual(gltf.animations.map(a=>a.name),['Survey','Walk','Run']);
  assert.ok(gltf.images.every(image=>image.bufferView!==undefined),'Textures must be bundled');
  assert.ok(gltf.buffers.every(buffer=>!buffer.uri),'Geometry must be bundled');
});

test('startup loads the bundled Fox through the regular GLB importer',async()=>{
  const imported=[];
  const context=vm.createContext({File,
    $:()=>({textContent:''}),toast:()=>{},console,
    fetch:async url=>{
      assert.equal(url,'./assets/models/Fox.glb');
      return {ok:true,blob:async()=>new Blob([model])};
    },
    loadGLBs:async files=>imported.push(...files)
  });
  vm.runInContext(defaultLoader,context);
  await vm.runInContext('loadDefaultModel()',context);
  assert.equal(imported.length,1);
  assert.equal(imported[0].name,'Fox.glb');
  assert.equal(imported[0].type,'model/gltf-binary');
  assert.deepEqual(Buffer.from(await imported[0].arrayBuffer()),model);
});

test('a failed default download leaves the editor ready for manual import',async()=>{
  const status={textContent:''},messages=[];
  const context=vm.createContext({File,
    $:()=>status,toast:message=>messages.push(message),console:{error:()=>{}},
    fetch:async()=>({ok:false,status:404}),
    loadGLBs:async()=>assert.fail('A failed request must not enter the importer')
  });
  vm.runInContext(defaultLoader,context);
  await vm.runInContext('loadDefaultModel()',context);
  assert.equal(status.textContent,'Import a GLB to get started');
  assert.equal(messages.length,1);
});
