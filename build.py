from pathlib import Path
import json, base64, shutil, re
from html import escape, unescape
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'aethra'
SOURCE=ROOT/'src'
if not SOURCE.exists():
    SOURCE=ROOT/'source'
    OUT=ROOT
OUT.mkdir(exist_ok=True)
assets={'viking':'data:image/jpeg;base64,'+base64.b64encode((OUT/'assets/mars.jpg').read_bytes()).decode()}
original=(SOURCE/'portal.html').read_text()
html=(SOURCE/'shell.html').read_text()
css=(SOURCE/'style.css').read_text()
js='\n'.join((SOURCE/name).read_text() for name in ['data.js','nasa-traverse.js','engine.js','mission-analysis.js','knowledge.js','globe.js','surface.js','nova.js','workbench.js','app.js'])
html=re.sub(r'<([a-zA-Z0-9]+)(\s[^>]*\bdata-en="([^"]*)"[^>]*)>.*?</\1>',lambda m:'<'+m[1]+m[2]+'>'+escape(unescape(m[3]).replace('\\n','\n'))+'</'+m[1]+'>',html,flags=re.S)
html=re.sub(r'<(?:input|textarea)\b[^>]*\bdata-placeholder-en="[^"]*"[^>]*>',lambda m:re.sub(r'(?<![\w-])placeholder="[^"]*"','placeholder="'+re.search(r'data-placeholder-en="([^"]*)"',m[0])[1]+'"',m[0]),html)
html=html.replace('__CSS__',css).replace('__AVATAR__',(SOURCE/'avatar.svg').read_text()).replace('__ASSETS__',json.dumps(assets).replace('<','\\u003c')).replace('__ORIGINAL__',json.dumps(original).replace('<','\\u003c')).replace('__JS__',js.replace('</script','<\\/script'))
(OUT/'index.html').write_text(html)
if OUT!=ROOT:
    (ROOT/'AETHRA.html').write_text(html)
    shutil.copytree(SOURCE,OUT/'source',dirs_exist_ok=True)
    shutil.copy2(ROOT/'build.py',OUT/'build.py')
print(f'Built {len(html.encode()):,} bytes: {OUT / "index.html"}')
