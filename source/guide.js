class NovaGuide {
 constructor({button,nova,getLanguage,go,notice}) {
  Object.assign(this,{button,nova,getLanguage,go,notice});this.active=false;this.section='explore';this.cursors={};this.done=new Set();this.frame=null;
  this.steps={
   explore:[
    ['#globe','Explore Mars','استكشف المريخ','Drag here to turn Mars. Use Ctrl + scroll, or the zoom buttons below it, to look closer. You can keep using the page while I explain.','اسحب هون لتدوير المريخ. قرّب باستخدام Ctrl مع السكرول أو أزرار التقريب تحته. بتقدر تستخدم الموقع وأنا بشرح.'],
    ['#sol-scrub','Try a Martian day','جرّب اليوم المريخي','Move this slider to turn the planet through a sol. The light slider beside it changes the illustrative lighting.','حرّك هذا المؤشر لتدوير الكوكب خلال يوم مريخي. مؤشر الضوء بجانبه بيغيّر الإضاءة التوضيحية.'],
    ['#plan-jezero','Choose your next step','اختار خطوتك التالية','This button opens planning for the selected destination. Selecting a globe marker changes the destination card and its NASA reference.','هذا الزر بيفتح التخطيط للمنطقة المختارة. اختيار علامة على الكوكب بيغيّر بطاقة الوجهة ومرجع ناسا.']],
   planner:[
    ['#load-terrain','Build your Marswalk','خطّط رحلتك','This is the route planner. This button requests NASA terrain images when connected. Downloaded tiles can be reused offline; the route remains schematic without them.','هون بتخطّط المسار. هذا الزر بطلب صور التضاريس من ناسا أثناء الاتصال. الصور المنزّلة ممكن تنستخدم دون نت؛ وبدونها المسار تخطيطي.'],
    ['#add-stop','Add a science stop','أضف محطة علمية','Choose a stop from this list, then press +. The route distance and time budget update with your choices.','اختار محطة من القائمة وبعدين اضغط +. مسافة المسار وميزانية الوقت بتتغيّر حسب اختياراتك.'],
    ['#reserve','Keep a time reserve','اترك احتياط وقت','Change walking speed, duration and reserve here. These are your planning assumptions, not live measurements from a spacesuit.','عدّل السرعة والمدة واحتياط الوقت هون. هاي افتراضاتك للتخطيط، مش قياسات مباشرة من بدلة فضاء.'],
    ['#export-plan','Take the plan with you','خذ خطتك معك','Download plan PDF saves your mapped itinerary and notes. Use Open a saved plan to restore that file later.','احفظ حزمة المهمة بتنزل خطتك وملاحظاتك. استخدم افتح خطة محفوظة لاستعادتها بعدين.']],
   fieldwork:[
    ['[data-wb-plan="geology"]','Connect the evidence','اربط الأدلة','Fieldwork compares science-stop choices. Try this geology option to update the plan, then inspect the linked map and station evidence.','العمل الميداني بقارن خيارات المحطات العلمية. جرّب خيار الجيولوجيا لتحديث الخطة، وبعدين استكشف الخريطة وأدلة المحطة.'],
    ['#wb-station','Read a station','افهم المحطة','Choose a station here to see its archived record, related evidence and a proposed observation task. Your field notes stay separate from NASA observations.','اختار محطة هون لتشوف سجلها المؤرشف والأدلة المرتبطة ومهمة رصد مقترحة. ملاحظاتك بتضل منفصلة عن قياسات ناسا.'],
    ['#wb-print-brief','Prepare a mission briefing','حضّر ملخّص المهمة','Download a PDF here with your mapped route, assumptions, schedule and evidence. Cached NASA terrain is included when available.','نزّل تقرير PDF هون مع رسم المسار والافتراضات والجدول والأدلة. صور تضاريس ناسا المحفوظة بتنضاف إذا كانت متاحة.']],
   atlas:[
    ['#site-search','Find a destination','دوّر على وجهة','Search this atlas by place or mission name. Each card explains a region and links to its NASA source.','ابحث بالأطلس باسم المنطقة أو المهمة. كل بطاقة بتشرح منطقة وبتربطك بمصدرها من ناسا.'],
    ['#atlas-grid button','Return to the globe','ارجع للكوكب','A destination card’s globe button takes you back to that location on Mars. The guide will follow you; return here whenever you want.','زر الكوكب ببطاقة الوجهة برجعك لموقعها على المريخ. الدليل بلحقك، وبتقدر ترجع هون بأي وقت.']],
   data:[
    ['#source-list','Inspect the sources','راجع المصادر','This is the NASA source register. It identifies what is embedded, what is an external reference, and the limits of each dataset.','هذا سجل مصادر ناسا. بوضّح البيانات المضمّنة والمراجع الخارجية وحدود كل مجموعة بيانات.'],
    ['#export-data','Keep the NASA records','احتفظ بسجلات ناسا','Download the embedded record subset as a PDF here. NOVA’s chat uses stored knowledge offline; external source pages still need a connection. That completes our page walkthrough.','نزّل مجموعة سجلات ناسا المضمّنة هون. محادثة نوفا بتستخدم المعرفة المخزنة دون نت؛ صفحات المصادر الخارجية بتحتاج اتصالًا. هيك منكون مرّينا على أقسام الموقع.']]
  };
  this.panel=document.createElement('aside');this.panel.id='nova-guide';this.panel.hidden=true;this.panel.setAttribute('role','region');this.panel.setAttribute('aria-label','NOVA guide');document.body.append(this.panel);
  this.ring=document.createElement('div');this.ring.className='guide-ring';this.ring.hidden=true;this.ring.setAttribute('aria-hidden','true');document.body.append(this.ring);
  this.arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');this.arrow.classList.add('guide-arrow');this.arrow.setAttribute('aria-hidden','true');this.arrow.innerHTML='<path></path><circle r="5"></circle>';this.arrow.style.display='none';document.body.append(this.arrow);
  this.button.onclick=()=>this.active?this.stop():this.start();
  window.addEventListener('scroll',()=>this.schedule(),{passive:true});window.addEventListener('resize',()=>this.schedule());
  document.addEventListener('keydown',e=>{if(this.active&&e.key==='Escape'){e.preventDefault();this.stop()}});
  this.translate();
 }
 t(en,ar){return this.getLanguage()==='ar'?ar:en}
 currentSection(){const y=Math.min(window.innerHeight*.35,280);let best=null;for(const id of Object.keys(this.steps)){const r=document.getElementById(id).getBoundingClientRect();if(r.top<=y&&r.bottom>y)best=id}return best}
 start(){if(document.body.classList.contains('journey-locked'))return;this.active=true;this.cursors={};this.done.clear();this.section=this.currentSection()||'explore';document.getElementById('assistant-chat').hidden=true;this.nova.close();this.nova.button.classList.add('guide-companion');this.nova.button.disabled=true;this.nova.setState('greeting');this.panel.hidden=false;this.translate();this.panel.querySelector('#guide-next').focus();this.schedule()}
 stop(completed=false){this.active=false;this.panel.hidden=true;this.ring.hidden=true;this.arrow.style.display='none';this.nova.button.classList.remove('guide-companion');this.nova.button.style.removeProperty('left');this.nova.button.style.removeProperty('top');this.nova.button.disabled=false;this.nova.close();this.translate();this.button.focus();if(completed)this.notice(this.t('Walkthrough complete. Restart anytime with Guide.','اكتملت الجولة. بتقدر تعيدها من زر الدليل.'))}
 translate(){this.button.textContent=this.active?this.t('End guide','إنهاء الدليل'):this.t('Guide','الدليل');this.button.setAttribute('aria-pressed',String(this.active));this.button.setAttribute('aria-label',this.t('Toggle the optional NOVA walkthrough','تشغيل أو إنهاء جولة نوفا الاختيارية'));if(this.active)this.render()}
 render(){
  const index=this.cursors[this.section]||0,steps=this.steps[this.section],s=steps[index],t=(en,ar)=>this.t(en,ar);this.targetSelector=s[0];this.revealTarget?.(s[0]);
  this.panel.dir=this.getLanguage()==='ar'?'rtl':'ltr';this.panel.setAttribute('aria-label',t('NOVA guide','دليل نوفا'));
  this.panel.innerHTML=`<div class="guide-top"><span>NOVA / ${t('YOUR GUIDE','دليلك')}</span><button id="guide-end" aria-label="${t('End the entire guide','إنهاء الدليل بالكامل')}">×</button></div><div class="guide-copy" aria-live="polite" aria-atomic="true"><small>${t('Step','الخطوة')} ${index+1} / ${steps.length} · ${this.done.size} / ${Object.keys(this.steps).length} ${t('sections complete','أقسام مكتملة')}</small><h3>${t(s[1],s[2])}</h3><p>${t(s[3],s[4])}</p></div><button id="guide-show" class="text-link">${t('Show me where ↗','ورّجيني وين ↗')}</button><div class="guide-actions"><button id="guide-skip">${t('Skip explanation','تخطّي الشرح')}</button><button id="guide-next" class="primary">${index===steps.length-1?t('Next section →','القسم التالي ←'):t('Next →','التالي ←')}</button></div><div class="guide-bottom"><button id="guide-section">${t('Skip this section','تخطّي هذا القسم')}</button><button id="guide-stop">${t('End guide · Esc','إنهاء الدليل · Esc')}</button></div>`;
  this.panel.querySelector('#guide-end').onclick=()=>this.stop();this.panel.querySelector('#guide-stop').onclick=()=>this.stop();
  this.panel.querySelector('#guide-next').onclick=()=>this.next();this.panel.querySelector('#guide-skip').onclick=()=>this.next();this.panel.querySelector('#guide-section').onclick=()=>this.nextSection();
  this.panel.querySelector('#guide-show').onclick=()=>this.showTarget();this.position();
 }
 next(){const i=this.cursors[this.section]||0;if(i<this.steps[this.section].length-1){this.cursors[this.section]=i+1;this.render();this.showTarget();this.panel.querySelector('#guide-next').focus()}else this.nextSection()}
 nextSection(){this.done.add(this.section);const keys=Object.keys(this.steps),at=keys.indexOf(this.section),order=[...keys.slice(at+1),...keys.slice(0,at)];const next=order.find(id=>!this.done.has(id));if(!next){this.stop(true);return}this.section=next;this.render();this.showTarget();this.panel.querySelector('#guide-next').focus()}
 showTarget(){const el=document.querySelector(this.targetSelector)||document.getElementById(this.section);el.scrollIntoView({behavior:'auto',block:'center'});if(window.innerWidth<760){const header=document.querySelector('.topbar').getBoundingClientRect().bottom;window.scrollBy({top:el.getBoundingClientRect().top-header-24,behavior:'auto'})}this.position()}
 schedule(){if(!this.active||this.frame!==null)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(!this.active)return;const id=this.currentSection();if(id&&id!==this.section){this.section=id;this.render()}this.position()})}
 position(){
  if(!this.active)return;const el=document.querySelector(this.targetSelector),r=el?.getBoundingClientRect(),w=window.innerWidth||1024,h=window.innerHeight||768;
  const mobile=w<760,pw=Math.min(330,w-24),ph=Math.min(this.panel.getBoundingClientRect().height||310,h*.58),right=!r||r.left+r.width/2<w/2;
  const x=mobile?12:right?w-pw-24:24,y=mobile?h-ph-12:Math.max(180,Math.min(h-ph-24,200));
  this.panel.style.width=pw+'px';this.panel.style.left=x+'px';this.panel.style.top=Math.max(12,y)+'px';
  this.nova.button.style.left=(mobile?Math.min(w-90,x+pw-80):right?x+pw-105:x)+'px';this.nova.button.style.top=Math.max(85,y-(mobile?78:125))+'px';
  const header=document.querySelector('.topbar').getBoundingClientRect().bottom,top=Math.max(r?.top||0,header+8),bottom=Math.min(r?.bottom||0,h-8);
  const visible=r&&r.width>0&&r.height>0&&bottom>top&&r.right>0&&r.left<w;
  this.ring.hidden=!visible;this.arrow.style.display=visible?'block':'none';if(!visible)return;
  const left=Math.max(4,r.left),rw=Math.min(w-4,r.right)-left,rh=bottom-top;
  Object.assign(this.ring.style,{left:(left-4)+'px',top:(top-4)+'px',width:(rw+8)+'px',height:(rh+8)+'px'});
  const tx=Math.max(12,Math.min(w-12,left+rw/2)),ty=top+Math.min(rh/2,32),sx=x+pw/2,sy=y;
  this.arrow.setAttribute('viewBox',`0 0 ${w} ${h}`);this.arrow.querySelector('path').setAttribute('d',`M ${sx} ${sy} Q ${sx} ${Math.min(sy,ty)-45} ${tx} ${ty}`);this.arrow.querySelector('circle').setAttribute('cx',tx);this.arrow.querySelector('circle').setAttribute('cy',ty);
 }
}
