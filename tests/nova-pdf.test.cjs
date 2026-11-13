const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),deps=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {createCanvas,Image,GlobalFonts}=require(path.join(deps,'@napi-rs/canvas'));
GlobalFonts.registerFromPath(path.join(root,'assets/report-regular.woff'),'AethraReport');GlobalFonts.registerFromPath(path.join(root,'assets/report-bold.woff'),'AethraReport');
const c=vm.createContext({console,Image,TextEncoder,TextDecoder,Uint8Array,Date,btoa,atob,Blob,document:{createElement:()=>createCanvas(1240,1754)},setTimeout,URL});
vm.runInContext(fs.readFileSync(path.join(root,'vendor/pdf-lib.min.js'),'utf8'),c);
for(const f of ['data.js','nasa-traverse.js','engine.js','mission-analysis.js','surface-map.js','landing-engine.js','nova-planner.js','reports.js'])vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),c);
const api=vm.runInContext('({AethraReports,NovaPlanner,SITES,PDFLib})',c);
const texture='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/mars.jpg')).toString('base64'),logo='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/logo.png')).toString('base64');
const out=process.env.AETHRA_REPORT_QA||'/tmp/aethra-nova-pdf-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{for(const [name,q]of [
 ['nova-en','Plan a mission to Jezero for 4 people for 3 hours with 2 stops'],
 ['nova-ar','اعملي رحلة للمريخ في جيزيرو لمدة 3 ساعات لعدد 4 أشخاص مع 2 محطات علمية'],
 ['nova-landing','Plan a Mars landing at Gale length 8 width 8 height 5 dry mass 8000 fuel 5000 Isp 320 crew 4'],
 ['nova-region-ar','بدي رحلة في آريس فاليس لمدة ساعتين لعدد 4 أشخاص']]){
 const result=api.NovaPlanner.reply(q,{selected:api.SITES[0],now:Date.UTC(2026,10,12)});assert(result.missionPlan,q);const value=result.missionPlan;const bytes=await api.AethraReports.build(value,{lang:value.lang,texture,logo});assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');const doc=await api.PDFLib.PDFDocument.load(bytes);assert(doc.getPageCount()>=3);assert(doc.getTitle().includes(value.title));assert.equal(doc.getSubject(),'AETHRA educational report');fs.writeFileSync(path.join(out,name+'.pdf'),bytes);console.log(name+': '+doc.getPageCount()+' pages / '+bytes.length+' bytes');
 }})().catch(e=>{console.error(e);process.exitCode=1});
