const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),deps=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {createCanvas,Image,GlobalFonts}=require(deps?path.join(deps,'@napi-rs/canvas'):'@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(root,'assets/report-regular.woff'),'AethraReport');GlobalFonts.registerFromPath(path.join(root,'assets/report-bold.woff'),'AethraReport');
const PDFLib=require(deps?path.join(deps,'pdf-lib'):'pdf-lib');
const context=vm.createContext({console,PDFLib,Image,TextEncoder,TextDecoder,Uint8Array,Date,btoa,atob,Blob,document:{createElement:()=>createCanvas(1240,1754)},setTimeout,URL});
vm.runInContext(fs.readFileSync(path.join(root,'vendor/pdf-lib.min.js'),'utf8'),context);
for(const f of ['nasa-traverse.js','engine.js','mission-analysis.js','surface-map.js','terrain.js','landing-engine.js','reports.js'])vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),context);
const api=vm.runInContext('({AethraReports,NASA_TRAVERSE,MarsEngine,MissionAnalysis,LandingEngine,LANDING_SOURCES,LANDING_SITES,JezeroTerrain})',context);
const texture='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/mars.jpg')).toString('base64');
const logo='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/logo.png')).toString('base64');
const pack={project:'AETHRA',version:2,source:api.NASA_TRAVERSE.source,base:12,stops:[2,17,24],options:{speed:1.5,endurance:300,sampleTime:10,reserve:25},operations:api.MissionAnalysis.defaults(),notes:['Inspect the fractured rocks. <img src=x onerror=alert(1)> is plain note text.','ملاحظة ميدانية: توثيق تشققات الصخور ومقارنة اتجاه المعالم.']};
const walk={project:'AETHRA',kind:'freewalk',version:1,points:[{lat:18.444627,lon:77.450885},{lat:18.4421,lon:77.4515},{lat:18.4436,lon:77.4545},{lat:18.4408,lon:77.4561}],options:pack.options};
const landing={project:'AETHRA',kind:'educational-landing-scenario',version:1,...api.LandingEngine.plan({...api.LandingEngine.defaults},Date.UTC(2026,10,6)),selectedSite:'utopia',sources:api.LANDING_SOURCES};
const out=process.env.AETHRA_REPORT_QA||'/tmp/aethra-pdf-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 for(const [name,value,lang] of [['mission',pack,'en'],['walk-ar',walk,'ar'],['landing',landing,'en'],['landing-ar',landing,'ar'],['records',api.NASA_TRAVERSE,'en'],['comparison',pack,'en'],['empty',{...walk,points:[]},'en'],['dateline',{...walk,points:[{lat:1,lon:179.8},{lat:1.1,lon:-179.9}]},'en']]){
  const bytes=await api.AethraReports.build(value,{name,lang,texture,logo,missionPack:pack});
  assert(Buffer.from(bytes).subarray(0,5).equals(Buffer.from('%PDF-')));assert(bytes.length>30000);
  const doc=await PDFLib.PDFDocument.load(bytes);assert(doc.getPageCount()>=2);for(const page of doc.getPages()){assert.equal(page.getWidth(),595.28);assert.equal(page.getHeight(),841.89)}
  fs.writeFileSync(path.join(out,name+'.pdf'),bytes);
  if(['mission','walk-ar','comparison','empty','dateline'].includes(name)){
   const reopened=await api.AethraReports.readPlan({name:name+'.pdf',size:bytes.length,type:'application/pdf',arrayBuffer:async()=>bytes});
   assert.equal(JSON.stringify(reopened),JSON.stringify(value));
   if(value.version===2)api.MarsEngine.validatePack(reopened,api.NASA_TRAVERSE.records);
  }
  console.log(name,doc.getPageCount(),'pages',bytes.length,'bytes');
 }
 // Check pagination with long notes and georeferenced image placement separately.
 const longPack={...pack,notes:Array.from({length:20},(_,i)=>'Field note '+i+': '+('Observe the rock texture and compare the science evidence. '.repeat(15)))};
 const longBytes=await api.AethraReports.build(longPack,{name:'mission',lang:'en',texture,logo});const longDoc=await PDFLib.PDFDocument.load(longBytes);assert(longDoc.getPageCount()>8);assert.equal(api.AethraReports.decode(longDoc.getSubject()).notes.at(-1),longPack.notes.at(-1));
 const terrain=Object.create(api.JezeroTerrain.prototype);terrain.records=api.NASA_TRAVERSE.records;terrain.z=15;terrain.tiles=new Map();const xy=terrain.records.map(r=>terrain.world(r));terrain.bounds={x0:Math.min(...xy.map(p=>p[0]))-60,x1:Math.max(...xy.map(p=>p[0]))+60,y0:Math.min(...xy.map(p=>p[1]))-60,y1:Math.max(...xy.map(p=>p[1]))+60};
 const tile=createCanvas(256,256),tc=tile.getContext('2d');tc.fillStyle='#e4c49e';tc.fillRect(0,0,256,256);tc.fillStyle='#352519';tc.font='20px AethraReport';tc.fillText('TEST TILE',40,128);for(const k of terrain.keys())terrain.tiles.set(k.key,tile.toDataURL('image/png'));
 const imageBytes=await api.AethraReports.build(pack,{name:'mission',texture,logo,terrain});assert((await PDFLib.PDFDocument.load(imageBytes)).getPageCount()>=3);fs.writeFileSync(path.join(out,'synthetic-tile-layout-test.pdf'),imageBytes);
 for(const r of terrain.records){const [x,y]=terrain.position(r,1096,580);assert(x>0&&x<1096&&y>0&&y<580)}
 console.log('Long notes pagination and cached-tile projection branch passed.');
 const legacy=await api.AethraReports.readPlan({name:'old.json',size:500,text:async()=>JSON.stringify(pack)});assert.equal(legacy.version,2);
 await assert.rejects(()=>api.AethraReports.readPlan({size:26*1024*1024}));
 const foreign=await PDFLib.PDFDocument.create();foreign.addPage();const b=await foreign.save();await assert.rejects(()=>api.AethraReports.readPlan({name:'foreign.pdf',size:b.length,arrayBuffer:async()=>b}));
 assert.throws(()=>api.AethraReports.decode('not a plan'));
 console.log('Real PDF exports, Arabic pages, legacy import, embedded plan round-trip, non-AETHRA and size rejection passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
