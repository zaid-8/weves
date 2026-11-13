const JOURNEY_MEDIA=__JOURNEY_MEDIA__;
class MarsJourneyBridge {
  constructor({section,frame,getState,navigate,openLanding}){
    this.section=section;this.frame=frame;this.getState=getState;this.navigate=navigate;this.openLanding=openLanding;this.pending=false;this.last='';this.scrollDelta=0;this.scrollQueued=false;this.inJourney=null;
    this.message=e=>this.receive(e);window.addEventListener('message',this.message);
    this.queue=()=>{if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.sync()})};
    window.addEventListener('scroll',this.queue,{passive:true});window.addEventListener('resize',this.queue,{passive:true});
    if('IntersectionObserver' in window){this.observer=new IntersectionObserver(this.queue);this.observer.observe(section)}
    frame.srcdoc=JSON.parse(document.getElementById('journey-html').textContent);this.sync();
  }
  geometry(){const r=this.section.getBoundingClientRect(),height=window.innerHeight||document.documentElement.clientHeight||800;return {start:(window.scrollY||0)+r.top,top:r.top,bottom:r.bottom??r.top+r.height,height,span:Math.max(1,(this.section.offsetHeight||r.height)-height)}}
  sync(force=false){const g=this.geometry(),state=this.getState(),progress=Math.max(0,Math.min(1,-g.top/g.span)),visible=g.top<g.height&&g.bottom>0&&state.unlocked;
    if(this.section.inert!==!state.unlocked)this.section.inert=!state.unlocked;const inJourney=visible&&g.top<g.height*.2&&g.bottom>g.height*.5;if(this.inJourney!==inJourney){this.inJourney=inJourney;document.body.classList.toggle('in-mars-journey',inJourney)}
    const data={type:'aethra-journey-state',progress,visible,lang:state.lang,theme:state.theme},key=JSON.stringify([Math.min(4,Math.floor(progress*5)),visible,state.lang,state.theme]);if(force||this.last!==key){this.last=key;this.frame.contentWindow?.postMessage(data,'*')}
  }
  scroll(delta){this.scrollDelta+=Math.max(-900,Math.min(900,delta));if(this.scrollQueued)return;this.scrollQueued=true;requestAnimationFrame(()=>{this.scrollQueued=false;const top=this.scrollDelta;this.scrollDelta=0;if(top&&this.getState().unlocked)window.scrollBy({top,behavior:'instant'});this.queue()})}
  seek(index){const g=this.geometry();window.scrollTo({top:g.start+((index+.35)/5)*g.span,behavior:'instant'});this.sync(true)}
  receive(e){if(e.source!==this.frame.contentWindow||!e.data)return;const d=e.data;if(d.type==='aethra-journey-loaded'){this.sync(true);this.refreshMedia();return}if(!this.getState().unlocked)return;
    if(d.type==='aethra-journey-scroll'&&Number.isFinite(d.delta))this.scroll(d.delta);
    if(d.type==='aethra-journey-seek'&&Number.isInteger(d.index)&&d.index>=0&&d.index<5)this.seek(d.index);
    if(d.type==='aethra-journey-exit'){if(d.direction===1)this.navigate('explore');else if(d.direction===-1){const g=this.geometry();window.scrollTo({top:Math.max(0,g.start-g.height*.7),behavior:'smooth'})}}
    if(d.type==='aethra-journey-home')this.navigate('portal-hero');
    if(d.type==='aethra-journey-action'){if(d.target==='landing')this.openLanding();else if(['explore','planner','walk','data','nova','jezero'].includes(d.target))this.navigate(d.target)}
  }
  async refreshMedia(){const db=window.AETHRA?.mapWorkspace?.db;if(!db)return;for(const [key,media] of Object.entries(JOURNEY_MEDIA)){try{const blob=await new Promise(resolve=>{const req=db.transaction('media').objectStore('media').get(media.url);req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null)});if(!(blob instanceof Blob))continue;this.frame.contentWindow?.postMessage({type:'aethra-journey-photo',key,blob},'*')}catch{}}}

}
