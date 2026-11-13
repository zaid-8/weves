import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from './linkedom.mjs';

// Exercise the actual built iframe and its bridge with mocked layout APIs.
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const outer=parseHTML(html).document;
assert.equal(outer.querySelector('#portal-hero').nextElementSibling.id,'mars-journey');
assert.equal(outer.querySelector('#mars-journey').nextElementSibling.className,'topbar');
const embedded=JSON.parse(outer.querySelector('#journey-html').textContent);
assert(!embedded.includes('__JOURNEY_'));
const {window,document}=parseHTML(embedded),$=s=>document.querySelector(s);
const sent=[],parent={postMessage:d=>sent.push(d)},timers=new Map();let timer=0;
window.HTMLElement.prototype.showModal=function(){this.open=true};
window.HTMLElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'))};
window.HTMLElement.prototype.focus=function(){};
window.HTMLElement.prototype.setPointerCapture=function(){};
const ctx=vm.createContext({window,document,parent,console,Blob,URL,innerHeight:900,innerWidth:1600,
  matchMedia:()=>({matches:false}),setTimeout:fn=>(timers.set(++timer,fn),timer),clearTimeout:id=>timers.delete(id)});
const flush=()=>{for(const [key,fn] of [...timers]){timers.delete(key);fn()}};
vm.runInContext($('script').textContent,ctx);
const dispatch=(target,type,props={})=>{const e=new window.Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);return e};
const state=(progress,lang='en',source=parent)=>{dispatch(window,'message',{source,data:{type:'aethra-journey-state',progress,visible:true,lang}});flush()};
assert.equal($('.logo img').src,outer.querySelector('.brand-logo').src);
assert.equal(outer.querySelector('link[rel=icon]').href,$('.logo img').src);
assert.equal(document.querySelectorAll('.card').length,5);
assert.equal($('#title').textContent,'MARS TERRAIN');
state(.8,'en',{});assert.equal($('#title').textContent,'MARS TERRAIN');
const titles=['MARS TERRAIN','PLAN YOUR WALK','SCIENCE STOPS','LANDING LAB','MISSION READY'];
for(let i=0;i<5;i++){state(i/5+.01);assert.equal($('#title').textContent,titles[i]);assert.equal(document.querySelectorAll('.card[aria-hidden=false]').length,1)}
for(let i=4;i>=0;i--){state(i/5+.01);assert.equal($('#title').textContent,titles[i])}
assert(dispatch($('#app'),'wheel',{deltaY:180,deltaMode:0}).defaultPrevented);
assert.equal(sent.at(-1).type,'aethra-journey-scroll');assert.equal(sent.at(-1).delta,180);
const n=sent.length;dispatch($('#app'),'wheel',{deltaY:180,ctrlKey:true});assert.equal(sent.length,n);
for(let i=0;i<5;i++){state(i/5+.01);$('#ascend').click();assert.equal(sent.at(-1).target,['explore','walk','jezero','landing','nova'][i])}
state(.81);$('#next').click();assert.equal(sent.at(-1).type,'aethra-journey-exit');assert.equal(sent.at(-1).direction,1);
state(0);$('#previous').click();assert.equal(sent.at(-1).direction,-1);
state(.41,'ar');assert.equal(document.documentElement.dir,'rtl');assert.equal($('#title').textContent,'محطات علمية');
$('#topic-details').click();assert($('#panel').open);assert($('.source-link').href.startsWith('https://science.nasa.gov/'));assert($('#panel-content').textContent.includes('ناسا'));
assert.equal(document.querySelectorAll('.step-list li').length,3);assert($('.image-provenance'));$('#enter').click();assert($('.flight').classList.contains('open'));assert($('.scene').inert);dispatch(document,'keydown',{key:'Escape'});assert(!$('.flight').classList.contains('open'));assert(!$('.scene').inert);
$('[data-panel=tools]').click();$('[data-tool=landing]').click();assert.equal(sent.at(-1).target,'landing');
state(.01);$('[data-panel=maps]').click();$('[data-map="3"]').click();flush();assert.equal(sent.at(-1).index,3);state(.67);assert.equal($('#title').textContent,'LANDING LAB');
dispatch($('#app'),'touchstart',{touches:[{clientX:200,clientY:500}]});dispatch($('#app'),'touchmove',{touches:[{clientX:200,clientY:420}]});assert.equal(sent.at(-1).delta,80);

let scrollY=0,unlocked=false;const posted=[],routes=[],listeners={};
const frame={contentWindow:{postMessage:d=>posted.push(d)}};
const section={offsetHeight:5400,getBoundingClientRect:()=>({top:900-scrollY,bottom:6300-scrollY,height:5400})};
const host={innerHeight:900,get scrollY(){return scrollY},addEventListener:(t,f)=>listeners[t]=f,scrollTo:({top})=>{scrollY=top},scrollBy:({top})=>{scrollY+=top}};
const hostDoc={documentElement:{},body:{classList:{toggle(){}}},getElementById:()=>({textContent:JSON.stringify(embedded)})};
const bridgeCtx=vm.createContext({window:host,document:hostDoc,requestAnimationFrame:fn=>fn()});
vm.runInContext(fs.readFileSync(new URL('source/journey-bridge.js',root),'utf8').replace('__JOURNEY_MEDIA__',fs.readFileSync(new URL('source/journey-media.json',root),'utf8'))+';globalThis.Bridge=MarsJourneyBridge',bridgeCtx);
const bridge=new bridgeCtx.Bridge({section,frame,getState:()=>({unlocked,lang:'en',theme:'dark'}),navigate:id=>routes.push(id),openLanding:()=>routes.push('landing')});
const message=(data,source=frame.contentWindow)=>bridge.receive({data,source});
message({type:'aethra-journey-scroll',delta:300});assert.equal(scrollY,0);
unlocked=true;message({type:'aethra-journey-seek',index:2},{});assert.equal(scrollY,0);
for(let i=0;i<5;i++){bridge.seek(i);assert.equal(Math.floor(posted.at(-1).progress*5),i)}
message({type:'aethra-journey-scroll',delta:Infinity});assert(Number.isFinite(scrollY));
message({type:'aethra-journey-exit',direction:1});assert.equal(routes.at(-1),'explore');
message({type:'aethra-journey-action',target:'landing'});assert.equal(routes.at(-1),'landing');
message({type:'aethra-journey-action',target:'jezero'});assert.equal(routes.at(-1),'jezero');
message({type:'aethra-journey-action',target:'walk'});assert.equal(routes.at(-1),'walk');
const before=routes.length;message({type:'aethra-journey-action',target:'unknown'});assert.equal(routes.length,before);
scrollY=900;bridge.sync();assert.equal(posted.at(-1).progress,0);assert.equal(section.inert,false);
scrollY=6301;bridge.sync();assert.equal(posted.at(-1).visible,false);
assert(!/\bmoon\b|\blunar\b|القمر|concept art/i.test(document.body.textContent));
state(.01);document.querySelectorAll('.card img')[0].onerror();assert($('#artwork-note').textContent.includes('Surface photo unavailable'));assert(document.querySelectorAll('.card img')[0].src.startsWith('data:image/jpeg;base64,'));
console.log('Mars journey passed: insertion order, exact logo/favicon, five reversible scroll chapters, source validation, arrows, exit, keyboard, touch, Arabic, topic panels, scene mode, tool links and parent bridge. Layout/browser APIs mocked.');
