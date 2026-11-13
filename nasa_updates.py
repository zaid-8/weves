"""NASA-only retrieval cache. Refreshes evidence, not model weights."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import copy
import hashlib
import json
import re
import threading
import time
import xml.etree.ElementTree as ET

INTERVAL = 60
SOURCES = (
    ('nasa-news', 'NASA news', 'https://www.nasa.gov/feed/', 'rss'),
    ('nasa-science', 'NASA Science news', 'https://science.nasa.gov/feed/', 'rss'),
    ('mars-overview', 'NASA Mars overview', 'https://science.nasa.gov/mars/', 'page'),
)
MARS = re.compile(r'\b(mars|martian|perseverance|curiosity|maven|jezero|escapade|phobos|deimos|ingenuity)\b', re.I)
STOP = set('the a an and of in on for to is are what how does about nasa mars mission missions new latest today news update updates tell me did has was with at it this please now'.split())
ALIASES = {'المريخ':'mars','مريخ':'mars','بيرسيفيرانس':'perseverance','برسيفيرانس':'perseverance','كيوريوسيتي':'curiosity','كريوسيتي':'curiosity','مافن':'maven','جيزيرو':'jezero','اسكابيد':'escapade','إسكابيد':'escapade','اسكاباد':'escapade','فوبوس':'phobos','ديموس':'deimos','غبار':'dust','عاصفة':'storm','مياه':'water','جليد':'ice','إطلاق':'launch','اطلاق':'launch','هبوط':'landing','رحلة':'mission','مهمة':'mission'}

def stamp(value=None):
    return datetime.fromtimestamp(time.time() if value is None else value, timezone.utc).isoformat()

def nasa_url(url):
    try:
        p = urlsplit(url)
        return p.scheme == 'https' and not p.username and not p.password and p.port in (None, 443) and (p.hostname == 'nasa.gov' or (p.hostname or '').endswith('.nasa.gov'))
    except ValueError:
        return False

class NasaRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not nasa_url(newurl):
            raise ValueError('Redirect outside NASA refused')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class Text(HTMLParser):
    def __init__(self, main=False):
        super().__init__(convert_charrefs=True)
        self.main_only, self.inside, self.skip, self.parts = main, False, [], []
    def handle_starttag(self, tag, attrs):
        if tag == 'main': self.inside = True
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'noscript'): self.skip.append(tag)
        if tag in ('p','div','li','h1','h2','h3','h4','br','section') and not self.skip: self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in self.skip:
            self.skip = self.skip[:self.skip.index(tag)]
        if tag == 'main': self.inside = False
        if tag in ('p','div','li','h1','h2','h3','h4','section') and not self.skip: self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip and (self.inside or not self.main_only): self.parts.append(data)

def plain(value, main=False):
    parser = Text(main)
    parser.feed(value)
    return '\n'.join(filter(None, (re.sub(r'\s+', ' ', x).strip() for x in ''.join(parser.parts).splitlines())))

def publication(value):
    if not value: return None
    try:
        d = parsedate_to_datetime(value)
    except (ValueError, TypeError):
        try: d = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError): return None
    return d.replace(tzinfo=d.tzinfo or timezone.utc).astimezone(timezone.utc).isoformat()

def parse_feed(data, source, checked):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper(): raise ValueError('DTD not accepted')
    root = ET.fromstring(data)
    if root.tag.split('}')[-1] not in ('rss', 'feed', 'RDF'): raise ValueError('Expected RSS or Atom')
    docs = []
    for item in root.iter():
        if item.tag.split('}')[-1] not in ('item', 'entry'): continue
        fields = {c.tag.split('}')[-1]: (c.text or '') for c in item}
        url = fields.get('link', '').strip()
        if not url:
            url = next((c.attrib.get('href','') for c in item if c.tag.split('}')[-1]=='link' and c.attrib.get('rel','alternate')=='alternate'), '')
        title = plain(fields.get('title',''))[:300]
        body = plain(fields.get('encoded') or fields.get('content') or fields.get('description') or fields.get('summary',''))
        if not nasa_url(url) or not title or not MARS.search(title+' '+body): continue
        docs.append({'id': hashlib.sha256(url.encode()).hexdigest()[:20], 'title':title, 'url':url, 'text':body[:18000], 'publishedAt':publication(fields.get('pubDate') or fields.get('published') or fields.get('date')), 'modifiedAt':publication(fields.get('updated')), 'checkedAt':checked, 'sourceId':source, 'kind':'news'})
    return docs[:100]

def fetch_source(url, headers):
    if not nasa_url(url): raise ValueError('NASA sources only')
    req = Request(url, headers={'User-Agent':'AETHRA/4.0 (educational Mars evidence reader)', 'Accept':'application/rss+xml, application/atom+xml, text/html;q=0.9', **headers})
    with build_opener(NasaRedirect()).open(req, timeout=10) as response:
        if not nasa_url(response.geturl()): raise ValueError('NASA sources only')
        data = response.read(3_000_001)
        if len(data)>3_000_000: raise ValueError('Source exceeds size limit')
        return response.status, dict(response.headers.items()), data

def tokens(question):
    q = question.lower()
    for ar, en in ALIASES.items(): q = q.replace(ar, ' '+en+' ')
    return set(re.findall(r'[a-z0-9]{3,}', q)) - STOP

def retrieve(documents, question, limit=4):
    terms = tokens(question)
    ranked=[]
    recent=bool(re.search(r'latest|today|new\b|news|current|recent|update|status|last|حالي|اليوم|جديد|جديده|جديدة|اخر|آخر|اخبار|أخبار|تحديث|مؤخر|صار|صارت',question,re.I))
    for d in documents:
        title=d['title'].lower();body=d['text'].lower()
        score=sum(6*(term in title)+min(3,body.count(term)) for term in terms)
        if terms and score<6 and not all(term in title or term in body for term in terms): continue
        if not terms and not recent: continue
        ranked.append((score, d.get('publishedAt') or '', d))
    ranked.sort(key=lambda x:(x[0],x[1]),reverse=True)
    return [d for _,_,d in ranked[:limit]]

def evidence_excerpt(doc, question, max_chars=4200):
    terms=tokens(question)
    paragraphs=doc['text'].splitlines()
    scored=sorted(enumerate(paragraphs),key=lambda p:sum(p[1].lower().count(w) for w in terms),reverse=True)
    selected=sorted(scored[:8],key=lambda p:p[0]) if terms else list(enumerate(paragraphs))
    return '\n'.join(p for _,p in selected)[:max_chars]

class NasaUpdates:
    def __init__(self, cache, fetcher=fetch_source, clock=time.time):
        self.cache=Path(cache);self.fetcher=fetcher;self.clock=clock
        self.lock=threading.RLock();self.cycle=threading.Lock();self.stop_event=threading.Event();self.thread=None
        self.states={sid:{'id':sid,'name':name,'url':url,'kind':kind,'status':'pending','lastAttempt':None,'lastSuccess':None,'lastChanged':None,'nextAttempt':0,'failures':0,'documents':[]} for sid,name,url,kind in SOURCES}
        try:
            raw=json.loads(self.cache.read_text(encoding='utf-8'))
            for sid,s in self.states.items():
                saved=raw.get('sources',{}).get(sid,{})
                if saved.get('url')!=s['url']:continue
                s.update({k:saved[k] for k in ('etag','lastModified','lastSuccess','lastChanged','hash') if k in saved})
                s['documents']=[d for d in saved.get('documents',[])[:150] if isinstance(d,dict) and nasa_url(d.get('url','')) and isinstance(d.get('text'),str) and isinstance(d.get('title'),str)]
                s['status']='cached'
        except (OSError,ValueError,TypeError,KeyError):pass

    def _one(self,sid):
        now=self.clock();checked=stamp(now)
        with self.lock:
            old=copy.deepcopy(self.states[sid])
            if old['nextAttempt']>now:return
            self.states[sid]['lastAttempt']=checked
        headers={}
        if old.get('etag'):headers['If-None-Match']=old['etag']
        if old.get('lastModified'):headers['If-Modified-Since']=old['lastModified']
        try:
            try:code,h,data=self.fetcher(old['url'],headers)
            except HTTPError as e:
                if e.code!=304:raise
                code,h,data=304,dict(e.headers or {}),b''
            if code not in (200,304):raise ValueError('Unexpected response status')
            if code==304:
                if not old.get('lastSuccess'):raise ValueError('304 without a cached representation')
                docs=old['documents'];digest=old.get('hash')
            else:
                digest=hashlib.sha256(data).hexdigest()
                if old['kind']=='rss':
                    docs=parse_feed(data,sid,checked)
                    incoming={d['url']:d for d in docs}
                    # Previously observed items can disappear from a short RSS feed.
                    for d in old['documents']:
                        if d['url'] not in incoming:incoming[d['url']]=d
                    docs=sorted(incoming.values(),key=lambda d:d.get('publishedAt') or '',reverse=True)[:150]
                else:
                    body=plain(data.decode('utf-8',errors='replace'),main=True)
                    if len(body)<200 or not MARS.search(body):raise ValueError('Expected NASA Mars main content')
                    docs=[{'id':sid,'title':old['name'],'url':old['url'],'text':body[:40000],'publishedAt':None,'modifiedAt':None,'checkedAt':checked,'sourceId':sid,'kind':'overview'}]
            changed=digest!=old.get('hash')
            h={k.lower():v for k,v in h.items()}
            with self.lock:
                self.states[sid].update(status='ok',lastSuccess=checked,lastChanged=checked if changed else old.get('lastChanged'),nextAttempt=now+INTERVAL,failures=0,error=None,documents=docs,hash=digest,etag=h.get('etag',old.get('etag')),lastModified=h.get('last-modified',old.get('lastModified')))
        except Exception as exc:
            count=old['failures']+1;delay=min(900,INTERVAL*2**min(count-1,4))
            if isinstance(exc,HTTPError) and exc.code in (429,503):
                retry=(exc.headers or {}).get('Retry-After','')
                try:delay=max(delay,int(retry))
                except ValueError:
                    date=publication(retry)
                    if date:delay=max(delay,int(datetime.fromisoformat(date).timestamp()-now))
            with self.lock:self.states[sid].update(status='unavailable',error=('HTTP '+str(exc.code)) if isinstance(exc,HTTPError) else type(exc).__name__,nextAttempt=now+max(INTERVAL,delay),failures=count)

    def refresh(self):
        if not self.cycle.acquire(blocking=False):return
        try:
            with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:list(pool.map(self._one,self.states))
            with self.lock:data=json.dumps({'sources':self.states},ensure_ascii=False)
            try:
                self.cache.parent.mkdir(parents=True,exist_ok=True)
                tmp=self.cache.with_suffix('.part');tmp.write_text(data,encoding='utf-8');tmp.replace(self.cache)
            except OSError:pass
        finally:self.cycle.release()

    def start(self):
        if self.thread:return
        def run():
            while not self.stop_event.is_set():
                started=self.clock();self.refresh()
                self.stop_event.wait(max(1,INTERVAL-(self.clock()-started)))
        self.thread=threading.Thread(target=run,daemon=True,name='nasa-evidence-refresh');self.thread.start()

    def snapshot(self, public=True):
        with self.lock:states=copy.deepcopy(list(self.states.values()))
        by_url={}
        for s in states:
            for d in s.pop('documents'):
                previous=by_url.get(d['url'])
                if not previous or (d.get('checkedAt') or '')>(previous.get('checkedAt') or ''):by_url[d['url']]=d
            s['nextAttempt']=stamp(s['nextAttempt']) if s['nextAttempt'] else None
            for key in ('etag','hash','lastModified','failures'):s.pop(key,None)
        documents=sorted(by_url.values(),key=lambda d:d.get('publishedAt') or '',reverse=True)[:160]
        if public:
            for d in documents:d['text']=d['text'][:6000]
        now=self.clock()
        healthy=sum(s['status']=='ok' and s['lastSuccess'] and now-datetime.fromisoformat(s['lastSuccess']).timestamp()<150 for s in states)
        status='current' if healthy==len(states) else 'partial' if healthy else 'cached' if documents else 'empty'
        return {'schema':1,'status':status,'intervalSeconds':INTERVAL,'serverTime':stamp(now),'sources':states,'documents':documents}

    def context(self, question):
        snap=self.snapshot(public=False);docs=retrieve(snap['documents'],question)
        return {'checkedSources':snap['sources'],'status':snap['status'],'serverTime':snap['serverTime'],'scope':'Selected NASA feeds and Mars overview, not every NASA page. Publication dates are not launch dates. Missing evidence does not prove an event did not happen.','documents':[{**d,'text':evidence_excerpt(d,question)} for d in docs]}
