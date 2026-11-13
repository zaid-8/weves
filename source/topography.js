const MARS_TOPOGRAPHY = {
 url:'https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004436/mars_cyl_topo2.jpg',
 source:'https://svs.gsfc.nasa.gov/4436/',
 credit:'NASA Scientific Visualization Studio / MGS MOLA',
 file:'mars-topography.jpg'
};

class GlobeTopography {
 constructor({globe,assets,getLanguage,notice,onChange}) {
  Object.assign(this,{globe,assets,getLanguage,notice,onChange});
  this.loading=false;this.saved=!!assets.topography;this.sessionImage=assets.topography||null;this.cache=null;
  this.button=document.getElementById('globe-topography');
  this.button.onclick=()=>this.select(this.globe.layer!=='topography');
  this.translate();
 }
 t(en,ar){return this.getLanguage()==='ar'?ar:en}
 async database(){
  if(this.cache)return this.cache;
  if(typeof indexedDB==='undefined')return null;
  return new Promise(resolve=>{
   let done=false;const finish=db=>{if(done){db?.close();return}done=true;clearTimeout(timer);if(db)this.cache=db;resolve(db)};
   const timer=setTimeout(()=>finish(null),2000);
   try{const request=indexedDB.open('aethra-globe-layers-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>finish(request.result);request.onerror=()=>finish(null);request.onblocked=()=>finish(null)}catch{finish(null)}
  });
 }
 async stored(value){
  const db=await this.database();if(!db)return null;
  return new Promise(resolve=>{let done=false;const finish=result=>{if(done)return;done=true;clearTimeout(timer);resolve(result)},timer=setTimeout(()=>finish(null),2000);
   try{const tx=db.transaction('images',value?'readwrite':'readonly'),store=tx.objectStore('images'),request=value?store.put(value,MARS_TOPOGRAPHY.url):store.get(MARS_TOPOGRAPHY.url);let result=null;request.onsuccess=()=>{result=value?true:request.result};tx.oncomplete=()=>finish(result);tx.onerror=()=>finish(null);tx.onabort=()=>finish(null)}catch{finish(null)}
  });
 }
 async fetchImage(){
  const urls=location.protocol==='file:'?[MARS_TOPOGRAPHY.url]:['/api/image?key=topography',MARS_TOPOGRAPHY.url];
  for(const url of urls){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
   try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('NASA image unavailable');const blob=await response.blob();if(!blob.type.startsWith('image/')||blob.size>12*1024*1024)throw Error('Invalid image');return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}catch{}finally{clearTimeout(timer)}
  }
  throw Error('Topography download failed');
 }
 async select(enabled=true){
  if(this.loading)return false;
  if(!enabled){try{await this.globe.setTexture(this.assets.viking,'viking');this.translate();this.onChange?.(null);return true}catch{return false}}
  if(this.globe.layer==='topography')return true;
  this.loading=true;this.translate();
  try{
   let data=this.sessionImage;
   if(!data){const cached=await this.stored();if(typeof cached==='string'&&cached.startsWith('data:image/')){data=cached;this.saved=true}}
   if(data){try{await this.globe.setTexture(data,'topography')}catch{data=null;this.saved=false}}
   if(!data){data=await this.fetchImage();await this.globe.setTexture(data,'topography');this.saved=!!(await this.stored(data))}
   this.sessionImage=data;this.onChange?.(data);
   this.notice(this.saved?this.t('NASA MOLA elevation is ready for offline reuse.','طبقة ارتفاعات MOLA من ناسا جاهزة لإعادة الاستخدام دون اتصال.'):this.t('NASA MOLA elevation loaded for this session.','تم تحميل ارتفاعات MOLA من ناسا لهذه الجلسة.'));
   return true;
  }catch{
   this.notice(this.t('NASA elevation image could not load. Connect once, or run DOWNLOAD-TOPOGRAPHY.bat from the project. Your current globe is unchanged.','تعذر تحميل صورة ارتفاعات ناسا. اتصل بالإنترنت مرة واحدة، أو شغّل DOWNLOAD-TOPOGRAPHY.bat من المشروع. بقي عرض الكوكب الحالي كما هو.'));
   return false;
  }finally{this.loading=false;this.translate()}
 }
 translate(){
  const active=this.globe.layer==='topography';this.button.disabled=this.loading;
  this.button.setAttribute('aria-pressed',String(active));this.button.setAttribute('aria-busy',String(this.loading));
  this.button.textContent=this.loading?this.t('Loading NASA layer…','جارٍ تحميل طبقة ناسا…'):this.t('◉ Color elevation','◉ التضاريس الملوّنة');
  const legend=document.getElementById('topography-legend');legend.hidden=!active;
  document.getElementById('topography-status').textContent=this.loading?this.t('Downloading the NASA image; the first load needs internet.','جارٍ تنزيل صورة ناسا؛ التحميل الأول يحتاج إنترنت.'):active?this.saved?this.t('NASA / MOLA · saved for offline use','NASA / MOLA · محفوظة دون اتصال'):this.t('NASA / MOLA · this session','NASA / MOLA · لهذه الجلسة'):this.t('Natural surface · switch to NASA elevation colors','السطح الطبيعي · بدّل إلى ألوان ارتفاعات ناسا');
  document.getElementById('globe-texture-caption').textContent=active?this.t('MGS / MOLA elevation, not temperature. NASA image with shaded relief; display lighting is illustrative. Colors are not used to calculate route slopes.','ارتفاعات MGS / MOLA وليست حرارة. صورة ناسا مع تظليل التضاريس؛ إضاءة العرض توضيحية. لا تُستخدم الألوان لحساب انحدار المسار.'):this.t('Drag to rotate · Ctrl + scroll or buttons to zoom · NASA texture: 1,440 × 720 px. Zoom enlarges the image; it does not create terrain detail.','اسحب لتدوير الكوكب · Ctrl مع السكرول أو الأزرار للتقريب · صورة ناسا: 1,440 × 720 بكسل. التقريب يكبّر الصورة ولا يضيف تفاصيل غير موجودة.');
 }
}
