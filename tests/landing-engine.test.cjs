const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Date,Math});vm.runInContext(fs.readFileSync('source/landing-engine.js','utf8')+';this.E=LandingEngine;this.S=LANDING_SITES;',ctx);const {E,S}=ctx;
const near=(a,b,tol=1e-6)=>assert(Math.abs(a-b)<tol,`${a} ≠ ${b}`),now=Date.parse('2026-10-21T12:00:00Z'),v={...E.defaults};
assert.equal(E.validate(v).errors.length,0);
for(const [key,value]of [['length',''],['width',0],['height',NaN],['dryMass',Infinity],['fuel',-1],['crew',1.5],['isp',0],['entrySpeed',10000],['priority','fake'],['face','side']])assert(E.validate({...v,[key]:value}).errors.includes(key));
assert(E.validate({...v,timing:'date',date:'2027-02-30'}).errors.includes('date'));assert(E.validate({...v,timing:'date',date:'2046-01-01'}).errors.includes('date'));assert.equal(E.validate({...v,timing:'date',date:'2028-02-29'}).errors.length,0);
const vehicle=E.vehicle(v);near(vehicle.area,16*Math.PI);near(vehicle.wetMass,13400);near(vehicle.inertMass,8400);near(vehicle.beta,13400/(1.5*16*Math.PI));
// Independent NASA Mars24 published benchmark; fixed modern TT offset changes it <.001°.
const sample=E.season(947116800000);near(sample.ls,277.18758,.001);near(sample.distance,1.39358,.00002);assert(sample.dusty);
near(E.solar(0,{declination:0,distance:1}),1361/Math.PI);near(E.solar(90,{declination:-.4,distance:1.5}),0);
const low=S.find(s=>s.id==='hellas'),high=S.find(s=>s.id==='meridiani'),a=E.descent(v,low,vehicle),b=E.descent(v,high,vehicle);assert(a.speed<b.speed);assert(a.required<b.required);
// Verify the returned burn closes the rocket equation using g0, not Mars gravity.
near(v.isp*9.80665*Math.log(vehicle.wetMass/(vehicle.wetMass-a.required)),a.deltaV);
const efficient=E.descent({...v,isp:450},low,vehicle);assert(efficient.required<a.required);
assert(E.descent(v,low,E.vehicle({...v,width:16})).required<a.required);
const plan=E.plan(v,now);assert.equal(plan.results.length,7);assert.equal(plan.times.length,4);assert(plan.times.every(t=>t.launch>=now));near((plan.times[1].launch-plan.times[0].launch)/E.DAY,E.SYNODIC);assert(E.SYNODIC>779&&E.SYNODIC<781);
for(const r of plan.results){assert(Number.isFinite(r.score)&&r.score>=0&&r.score<=100);near(r.score,Object.entries(plan.weights).reduce((total,[key,w])=>total+r.scores[key]*w,0));assert(r.fuelRange[0]<=r.flight.required&&r.flight.required<=r.fuelRange[1]);assert(r.flight.required<vehicle.wetMass);assert(r.solarRange[0]<=r.solarRange[1]);}
assert(plan.best?.flight.enough);assert.equal(E.plan({...v,fuel:0},now).best,null);
const manual=E.plan({...v,timing:'date',date:'2028-02-29'},now);assert(manual.results.every(r=>new Date(r.time.arrival).toISOString().startsWith('2028-02-29')));near((manual.times[0].arrival-manual.times[0].launch)/E.DAY,210);
assert.equal(E.plan({...v,priority:'water'},now).results[0].site.id,'arcadia');
for(const extreme of [{length:.5,width:.5,height:.5,dryMass:500000,fuel:1000000,isp:100,crew:20},{length:60,width:60,height:60,dryMass:100,fuel:0,crew:0}]){const p=E.plan({...v,...extreme},now);assert(p.results.every(r=>Number.isFinite(r.flight.required)&&Number.isFinite(r.score)))}
console.log('Landing engine passed: NASA seasonal benchmark, independent rocket equation, geometry, atmospheric/Isp sensitivity, date/range validation, fuel gate, scores, cycle timing and extremes.');
console.log(plan.results.map(r=>({site:r.site.id,score:+r.score.toFixed(1),fuel:Math.round(r.flight.required),arrival:new Date(r.time.arrival).toISOString().slice(0,10)})));
