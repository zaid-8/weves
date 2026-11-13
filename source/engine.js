const MarsEngine=(()=>{
const bounds={speed:[.2,6],endurance:[15,720],sampleTime:[0,120],reserve:[0,75]};
function plan(records,base,stops,options){
 if(!Number.isInteger(base)||!records[base])throw Error('Invalid departure record');
 if(!Array.isArray(stops)||stops.some(i=>!Number.isInteger(i)||!records[i]))throw Error('Invalid stop record');
 const o={};for(const [key,[min,max]] of Object.entries(bounds)){const value=Number(options[key]);if(!Number.isFinite(value)||value<min||value>max)throw Error('Invalid planning assumption: '+key);o[key]=value}
 const unique=[...new Set(stops)].filter(i=>i!==base).sort((a,b)=>a-b),lo=Math.min(base,...unique),hi=Math.max(base,...unique);
 const distance=unique.length?2*(records[hi].distance-records[lo].distance):0;
 const walkMinutes=distance/1000/o.speed*60,sampleMinutes=unique.length*o.sampleTime,totalMinutes=walkMinutes+sampleMinutes,usableMinutes=o.endurance*(1-o.reserve/100);
 return {base,stops:unique,lo,hi,distance,walkMinutes,sampleMinutes,totalMinutes,usableMinutes,reserveMinutes:o.endurance*o.reserve/100,remainingMinutes:usableMinutes-totalMinutes,withinBudget:unique.length>0&&totalMinutes<=usableMinutes,options:o,hasStops:unique.length>0};
}
function validatePack(pack,records){if(!pack||pack.project!=='AETHRA'||pack.version!==2||pack.source!==NASA_TRAVERSE.source)throw Error('Unsupported mission pack');const p=plan(records,pack.base,pack.stops,pack.options);const notes=pack.notes;if(!Array.isArray(notes)||notes.length>200||notes.some(n=>typeof n!=='string'||n.length>1000))throw Error('Invalid notes');return {base:p.base,stops:p.stops,options:p.options,notes,operations:MissionAnalysis.validate(pack.operations,records)}}
return {plan,validatePack};
})();
