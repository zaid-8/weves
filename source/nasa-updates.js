class NovaNasaUpdates {
 constructor({getLanguage}) {
  this.getLanguage=getLanguage;this.data={sources:[],documents:[],status:'empty'};this.connected=false;this.lastFetch=0;this.pending=null;this.initialRetries=0;
  try {const saved=JSON.parse(localStorage.getItem('aethra-nasa-evidence-v1')||'null');if(saved)this.accept(saved)}catch{}
  this.box=document.createElement('section');this.box.className='nova-nasa';this.box.id='nova-nasa';
  this.box.innerHTML='<p id="nasa-freshness" role="status"></p><details><summary id="nasa-details-label"></summary><p id="nasa-update-explanation"></p><div id="nasa-source-status"></div><button type="button" id="nasa-recheck" class="text-link"></button></details>';
  document.getElementById('local-settings').after(this.box);
  this.box.querySelector('#nasa-recheck').onclick=()=>this.refresh(true);
  this.render();this.refresh();this.timer=setInterval(()=>this.refresh(),60000);
  window.addEventListener('online',()=>this.refresh(true));
  window.addEventListener('offline',()=>{this.connected=false;this.render()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')this.refresh()});
 }
 t(en,ar){return this.getLanguage()==='ar'?ar:en}
 safe(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='nasa.gov'||u.hostname.endsWith('.nasa.gov'))}catch{return false}}
 accept(data){
  if(data?.schema!==1||!Array.isArray(data.documents)||!Array.isArray(data.sources))throw Error('Invalid NASA cache');
  this.data={...data,sources:data.sources.filter(s=>this.safe(s.url)).slice(0,8),documents:data.documents.filter(d=>this.safe(d.url)&&typeof d.title==='string'&&typeof d.text==='string').slice(0,160)};
 }
 async refresh(force=false){
  if(this.pending)return this.pending;
  if(location.protocol==='file:'){this.connected=false;this.render();return}
  if(!force&&Date.now()-this.lastFetch<15000)return;
  this.lastFetch=Date.now();
  this.pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{const response=await fetch('/api/nasa-updates',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('NASA service unavailable');this.accept(await response.json());this.connected=true;if(this.data.sources.some(s=>s.status==='pending')&&this.initialRetries++<4)setTimeout(()=>this.refresh(true),5000);try{localStorage.setItem('aethra-nasa-evidence-v1',JSON.stringify(this.data))}catch{}}
   catch{this.connected=false}finally{clearTimeout(timer);this.pending=null;this.render()}
  })();return this.pending;
 }
 date(value){const date=new Date(value);return value&&Number.isFinite(+date)?date.toLocaleString(this.getLanguage()==='ar'?'ar-JO':'en-GB'):this.t('Not yet','لم يتم بعد')}
 fresh(){return this.connected&&this.data.status==='current'&&this.data.sources.every(s=>s.status==='ok'&&s.lastSuccess&&Date.now()-new Date(s.lastSuccess)<150000)}
 label(){if(this.connected&&this.data.sources.some(s=>s.status==='pending'))return this.t('Checking NASA sources…','جارٍ فحص مصادر ناسا…');return this.fresh()?this.t('NASA sources checked','تم فحص مصادر ناسا'):this.connected&&this.data.status==='partial'?this.t('NASA sources partly available','بعض مصادر ناسا متاحة'):this.data.documents.length?this.t('Saved NASA evidence · not live','أدلة ناسا محفوظة · ليست مباشرة'):this.t('NASA updates not available yet','تحديثات ناسا غير متاحة بعد')}
 render(){
  if(!this.box)return;
  const dates=this.data.sources.map(s=>s.lastSuccess).filter(Boolean).sort();
  this.box.querySelector('#nasa-freshness').textContent=this.label()+(dates.length?' · '+this.t('Last successful check: ','آخر فحص ناجح: ')+this.date(dates.at(-1)):'');
  this.box.querySelector('#nasa-details-label').textContent=this.t('NASA update details','تفاصيل تحديث ناسا');
  this.box.querySelector('#nasa-update-explanation').textContent=location.protocol==='file:'?this.t('For automatic updates, run START-WINDOWS.bat and open AETHRA at http://127.0.0.1:8765. Downloaded knowledge remains available offline.','للتحديث التلقائي شغّل START-WINDOWS.bat وافتح إيثرا على http://127.0.0.1:8765. تبقى المعرفة المحمّلة متاحة دون إنترنت.'):this.t('While start.py is running and internet is available, selected NASA feeds and the Mars overview are checked about every 60 seconds. Failures use retry delays. Coverage is limited to these sources; publication may lag an event. This refreshes evidence, not the model itself.','أثناء تشغيل start.py وتوفر الإنترنت، تُفحص خلاصات ناسا المحددة وصفحة المريخ كل 60 ثانية تقريبًا، مع تأخير المحاولة عند الفشل. التغطية تخص هذه المصادر وقد يتأخر نشر الحدث. تتحدث الأدلة وليس تدريب النموذج.');
  const host=this.box.querySelector('#nasa-source-status');host.replaceChildren();
  for(const s of this.data.sources){const row=document.createElement('p'),a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=s.name+' ↗';row.append(a,document.createTextNode(' — '+this.t('Checked: ','تم الفحص: ')+this.date(s.lastSuccess)+(s.status!=='ok'?' · '+this.t('Retry pending / saved copy','بانتظار إعادة المحاولة / نسخة محفوظة'):'')));host.append(row)}
  this.box.querySelector('#nasa-recheck').textContent=this.t('Reload update status','إعادة تحميل حالة التحديث');
 }
 normalize(q){
  let s=q.toLowerCase();const aliases={'المريخ':'mars','مريخ':'mars','بيرسيفيرانس':'perseverance','برسيفيرانس':'perseverance','كيوريوسيتي':'curiosity','مافن':'maven','جيزيرو':'jezero','إسكابيد':'escapade','اسكابيد':'escapade','اسكاباد':'escapade','فوبوس':'phobos','ديموس':'deimos','غبار':'dust','جليد':'ice','مياه':'water','هبوط':'landing','إطلاق':'launch','اطلاق':'launch'};
  for(const [a,b] of Object.entries(aliases))s=s.split(a).join(' '+b+' ');
  const stop=new Set('the and for what how does about nasa mars mission missions latest today news update updates tell with new me did current status recent happen spacecraft'.split(' '));return [...new Set(s.match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w));
 }
 reply(question){
  const recent=/latest|today|new\b|news|current|recent|update|status|last|حالي|اليوم|جديد|اخر|آخر|اخبار|أخبار|تحديث|مؤخر|صار|صارت/i.test(question),words=this.normalize(question);
  let matches=this.data.documents.map(d=>({d,score:words.reduce((n,w)=>n+(d.title.toLowerCase().includes(w)?6:0)+(d.text.toLowerCase().includes(w)?1:0),0)})).filter(x=>recent?(!words.length||x.score>=6||words.every(w=>(x.d.title+' '+x.d.text).toLowerCase().includes(w))):x.score>=6);
  matches.sort((a,b)=>b.score-a.score||(b.d.publishedAt||'').localeCompare(a.d.publishedAt||''));
  if(recent&&!words.length){const news=matches.filter(x=>x.d.kind==='news');matches=news.length?news:matches}
  if(!recent&&!matches.length)return null;
  const docs=matches.slice(0,3).map(x=>x.d),ar=/[\u0600-\u06ff]/.test(question),say=(en,arabic)=>ar?arabic:en;
  let text=say('NASA evidence available to NOVA. ','أدلة ناسا المتاحة لنوفا. ')+this.label()+'.\n';
  if(!docs.length)text+=say('I cannot confirm that event from the NASA records currently available here. Missing coverage does not mean it did not happen. Check the source status below and ask again after a successful update.','لا أستطيع تأكيد هذا الحدث من سجلات ناسا المتاحة هنا حاليًا. عدم وجوده لا يعني أنه لم يحدث. راجع حالة المصادر وأعد السؤال بعد تحديث ناجح.');
  for(const d of docs){text+='\n'+d.title+'\n'+say('Published: ','نُشر: ')+this.date(d.publishedAt)+'\n'+say('Evidence retrieved: ','جُلب الدليل: ')+this.date(d.checkedAt)+'\n';const excerpt=d.text.replace(/\s+/g,' ').slice(0,420);text+=say('NASA excerpt: ','مقتطف ناسا باللغة الأصلية: ')+excerpt+(d.text.length>420?'…':'')+'\n'}
  text+='\n'+say('Publication time is not a launch date. These sources do not cover every event.','وقت النشر ليس تاريخ الإطلاق. هذه المصادر لا تغطي كل حدث.');
  return {text,sources:docs.map(d=>({url:d.url,title:d.title,arTitle:d.title})),topic:'nasa-updates'};
 }
}
