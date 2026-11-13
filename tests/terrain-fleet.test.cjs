const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const context=vm.createContext({document:{querySelector:()=>({})}});vm.runInContext(['nasa-traverse.js','terrain.js','fleet-data.js','knowledge.js','nova-search.js'].map(n=>fs.readFileSync('source/'+n,'utf8')).join('\n')+';this.api={NASA_TRAVERSE,JezeroTerrain,MARS_FLEET,researchReply}',context);
const {NASA_TRAVERSE,JezeroTerrain,MARS_FLEET,researchReply}=context.api;
const map=new JezeroTerrain({records:NASA_TRAVERSE.records,getLanguage:()=> 'en',changed(){},notice(){}});
assert.equal(MARS_FLEET.length,23);assert.equal(new Set(MARS_FLEET.map(s=>s.id)).size,23);
for(const c of MARS_FLEET){assert(new URL(c.source).hostname.endsWith('.nasa.gov'));assert.equal(c.parts.length,4)}
for(const t of map.keys()){assert(t.x>=23430&&t.x<=23438);const y=2**map.z-1-t.y;assert(y>=18088&&y<=18100);assert(t.key.endsWith('/'+y));assert(map.url(t.key).startsWith('https://mars.nasa.gov/'))}
for(const r of NASA_TRAVERSE.records){const [x,y]=map.position(r,640,620);assert(x>0&&x<640&&y>0&&y<620)}
const home=NASA_TRAVERSE.records[0],north={...home,lat:home.lat+.001},east={...home,lon:home.lon+.001};assert(map.position(north,640,620)[1]<map.position(home,640,620)[1]);assert(map.position(east,640,620)[0]>map.position(home,640,620)[0]);assert(map.metresToPixels(200,640,620)>0);
const reply=researchReply('Compare Curiosity and Perseverance',{fleet:{selected:MARS_FLEET[0]}});assert.equal(reply.sources.length,2);assert(reply.text.includes('SAM'));assert(reply.text.includes('MOXIE'));
const follow=researchReply('شو جواتها',{fleet:{selected:MARS_FLEET[0]}},{topic:'fleet',site:'ingenuity'});assert(follow.text.includes('دوّاران'));
assert.equal(researchReply('Review my route',{fleet:{selected:MARS_FLEET[0]}}),null);
console.log('Terrain coordinate arithmetic, Jezero proxy window, NASA-only fleet sources, bilingual spacecraft follow-ups and plan intent separation passed. Tiles remain unverified against live NASA imagery.');
