class GlobeLab {
 constructor({root,globe,getLanguage,selectSite}) {
  Object.assign(this,{root,globe,getLanguage,selectSite});this.hour=0;this.origin=globe.lon;this.light=-32;this.compare=false;
  this.render();
 }
 t(en,ar){return this.getLanguage()==='ar'?ar:en}
 render(){
  const t=(en,ar)=>this.t(en,ar);
  this.root.innerHTML=`<div class="lab-heading"><div><span class="eyebrow">NASA / MARS FACTS</span><h3>${t('Get to know this world.','تعرّف على هذا العالم.')}</h3></div><a class="text-link" href="https://science.nasa.gov/mars/facts/" target="_blank" rel="noopener">${t('Science behind the controls ↗','المصدر العلمي للأدوات ↗')}</a></div>
  <div class="lab-grid">
  <article><span class="lab-index">◎</span><h4>${t('A sense of scale','مقارنة الحجم')}</h4><p>${t('Mars has a radius of 3,390 km: about half Earth’s size.','نصف قطر المريخ 3,390 كم: نحو نصف حجم الأرض.')}</p><button id="size-compare" aria-expanded="${this.compare}" aria-controls="size-drawing">${t('Compare with Earth','قارن مع الأرض')}</button><div id="size-drawing" class="size-drawing" ${this.compare?'':'hidden'}><div class="earth-disc"><span>${t('Earth','الأرض')}</span></div><div class="mars-disc"><span>${t('Mars','المريخ')}</span></div><small>${t('Approximate diameter ratio · 1 : 0.5','نسبة الأقطار تقريبية · 1 : 0.5')}</small></div></article></div><p class="caption">${t('Controls change the display. Globe rotation is not a mission clock.','الأدوات تغيّر العرض؛ دوران الكوكب ليس ساعة مهمة.')}</p>`;
  document.getElementById('rotation-control').innerHTML=`<label for="sol-scrub">${t('Rotation','الدوران')} <output id="sol-value" dir="ltr">${this.hour.toFixed(1)} h</output></label><div class="compact-range" dir="ltr"><input id="sol-scrub" type="range" min="0" max="24.6" step="0.1" value="${this.hour}"><button id="sol-anchor" title="${t('Use this view as start','ابدأ من هذا المنظور')}" aria-label="${t('Use this view as start','ابدأ من هذا المنظور')}">↻</button></div>`;
  document.getElementById('lighting-control').innerHTML=`<label for="sun-angle">${t('Lighting','الإضاءة')} <output id="sun-value" dir="ltr">${this.light}°</output></label><div class="compact-range" dir="ltr"><span aria-hidden="true">◐</span><input id="sun-angle" type="range" min="-180" max="180" step="1" value="${this.light}"></div>`;
  document.getElementById('globe-marker-control').innerHTML=`<button id="globe-pins" aria-pressed="${!this.globe.hidePins}">${t('Markers','المواقع')}</button>`;
  const q=s=>document.querySelector(s);
  q('#sol-scrub').oninput=()=>{this.hour=Number(q('#sol-scrub').value);this.globe.lon=this.origin+360*this.hour/24.6;this.globe.auto=false;this.globe.fallbackDirty=true;q('#sol-value').textContent=this.hour.toFixed(1)+' h';document.dispatchEvent(new Event('mars-orbit-change'))};
  q('#sol-anchor').onclick=()=>{this.origin=this.globe.lon;this.hour=0;q('#sol-scrub').value='0';q('#sol-value').textContent='0.0 h'};
  q('#sun-angle').oninput=()=>{this.light=Number(q('#sun-angle').value);this.globe.sunAngle=this.light*Math.PI/180;this.globe.fallbackDirty=true;q('#sun-value').textContent=this.light+'°'};
  q('#globe-pins').onclick=()=>{this.globe.hidePins=!this.globe.hidePins;this.globe.drawOverlay();q('#globe-pins').setAttribute('aria-pressed',String(!this.globe.hidePins))};
  q('#size-compare').onclick=()=>{this.compare=!this.compare;q('#size-drawing').hidden=!this.compare;q('#size-compare').setAttribute('aria-expanded',String(this.compare))};
 }
 reset(){this.light=-32;this.hour=0;this.origin=this.globe.lon;this.globe.sunAngle=-32*Math.PI/180;this.globe.hidePins=false;this.render()}
 translate(){this.render()}
}
