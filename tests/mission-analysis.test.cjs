const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({});vm.runInContext(['nasa-traverse.js','engine.js','mission-analysis.js'].map(n=>fs.readFileSync('source/'+n,'utf8')).join('\n')+'\nthis.api={NASA_TRAVERSE,MarsEngine,MissionAnalysis}',ctx);
const {NASA_TRAVERSE,MarsEngine,MissionAnalysis}=ctx.api,records=NASA_TRAVERSE.records,o={speed:1.5,endurance:180,sampleTime:10,reserve:25},ops=MissionAnalysis.defaults(),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
for(const base of [0,10,17,21,28])for(const stops of [[],[0],[17,21],[0,17,28],[28,28,base]]){
 const p=MarsEngine.plan(records,base,stops,o),a=MissionAnalysis.analyze(records,p,ops);
 near(a.distance,p.distance);near(a.totalMinutes,p.totalMinutes);
 for(const row of a.rows){near(row.margin,p.usableMinutes-row.departure-row.returnMinutes-ops.delay);near(row.latestDeparture,p.usableMinutes-row.returnMinutes-ops.delay);assert(row.leg>=0);assert(row.home>=0)}
 assert.equal(a.rows.length,p.stops.length);
}
const p=MarsEngine.plan(records,0,[17,21],o),a=MissionAnalysis.analyze(records,p,ops);
near(a.rows[0].arrival,597.922/1500*60);near(a.rows[1].returnMinutes,1093.009/1125*60);assert(a.robust);
const slow=MissionAnalysis.analyze(records,p,{...ops,returnFactor:.25});assert(slow.criticalMargin<a.criticalMargin);assert(!slow.robust);
const delayed=MissionAnalysis.analyze(records,p,{...ops,delay:120});assert(!delayed.robust);
assert.equal(MissionAnalysis.analyze(records,MarsEngine.plan(records,0,[],o),ops).criticalMargin,null);
const choices=MissionAnalysis.candidates(records,p,ops);assert(choices[1].plan.distance<choices[0].plan.distance);assert.equal(records[choices[2].plan.stops[0]].sol,135);
const pack={project:'AETHRA',version:2,source:NASA_TRAVERSE.source,base:0,stops:[17,21],options:o,notes:[]};assert.equal(MarsEngine.validatePack(pack,records).operations.returnFactor,.75);
const log={record:25,kind:'obstacle',text:'Inspect sand patch',time:'2026-10-17T12:00:00.000Z'};assert.equal(MarsEngine.validatePack({...pack,operations:{...ops,logs:[log]}},records).operations.logs[0].record,25);
for(const bad of [{...ops,returnFactor:0},{...ops,delay:NaN},{...ops,logs:[{...log,record:999}]},{...ops,logs:[{...log,kind:'NASA verified'}]},{...ops,logs:[{...log,time:'invalid'}]}])assert.throws(()=>MarsEngine.validatePack({...pack,operations:bad},records));
for(const s of Object.values(MissionAnalysis.sources))assert(new URL(s.url).hostname.endsWith('.nasa.gov'));
console.log('Mission analysis passed: interval traversal, both sides of base, empty plans, time identity, independent return arithmetic, slowdown/delay sensitivity, candidate target, legacy packs and invalid observation rejection.');
