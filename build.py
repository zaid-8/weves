from pathlib import Path
import json,base64
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'source'
def data(name,mime):
    return 'data:'+mime+';base64,'+base64.b64encode((ROOT/'assets'/name).read_bytes()).decode()
logo=data('logo.png','image/png')
favicon=data('favicon.png','image/png')
font=data('aethra-display.woff','font/woff')
assets={'viking':data('mars.jpg','image/jpeg')}
if (ROOT/'assets/mars-topography.jpg').exists(): assets['topography']=data('mars-topography.jpg','image/jpeg')
report_fonts='@font-face{font-family:AethraReport;src:url('+data('report-regular.woff','font/woff')+') format("woff");font-weight:400}@font-face{font-family:AethraReport;src:url('+data('report-bold.woff','font/woff')+') format("woff");font-weight:700}'
integration=(SOURCE/'integration.css').read_text()
portal_css=(SOURCE/'portal.css').read_text()+(SOURCE/'landing-match.css').read_text().replace('__DISPLAY_FONT__',font)+integration
portal=(SOURCE/'portal.html').read_text().replace('__LOGO__',logo).replace('__PORTAL_CSS__',portal_css).replace('__PORTAL_JS__',(SOURCE/'portal.js').read_text())
journey_assets={key:data(name,'image/'+('jpeg' if name.endswith('.jpg') else name.rsplit('.',1)[1])) for key,name in json.loads((SOURCE/'journey-assets.json').read_text()).items()}
media=json.loads((SOURCE/'journey-media.json').read_text())
for key,item in media.items():
    local=ROOT/'assets'/item['file']
    journey_assets[key]=data(item['file'],'image/jpeg') if local.exists() else item['url']
chapters=json.loads((SOURCE/'journey-chapters.json').read_text())
journey_css=(SOURCE/'journey-original.css').read_text().replace('__JOURNEY_FONT__',data('journey-display.woff2','font/woff2')).replace('__JOURNEY_BACKGROUND__',journey_assets['background'])+(SOURCE/'journey-theme.css').read_text()
journey_js=(SOURCE/'journey.js').read_text().replace('__JOURNEY_CHAPTERS__',json.dumps(chapters,ensure_ascii=False)).replace('__JOURNEY_MEDIA__',json.dumps(media,ensure_ascii=False)).replace('__JOURNEY_ASSETS__',json.dumps(journey_assets).replace('<','\\u003c'))
journey_html=(SOURCE/'journey.html').read_text().replace('__LOGO__',logo).replace('__JOURNEY_CSS__',journey_css).replace('__JOURNEY_JS__',journey_js.replace('</script','<\\/script'))
order=['data.js','nasa-traverse.js','engine.js','mission-analysis.js','knowledge.js','globe.js','topography.js','source-archive.js','terrain.js','fleet-data.js','map-data.js','surface-map.js','map-workspace.js','nova-search.js','nova.js','globe-lab.js','guide.js','landing-engine.js','landing-planner.js','workbench.js','journey-bridge.js','nova-planner.js','reports.js','nasa-updates.js','app.js']
js=(ROOT/'vendor/pdf-lib.min.js').read_text()+';\n'+'\n'.join((SOURCE/name).read_text() for name in order).replace('__JOURNEY_MEDIA__',json.dumps(media,ensure_ascii=False))
html=(SOURCE/'shell.html').read_text().replace('__LOGO__',logo).replace('__FAVICON__',favicon).replace('__CSS__',report_fonts+(SOURCE/'style.css').read_text()+integration+(SOURCE/'archive.css').read_text()+(SOURCE/'nasa-updates.css').read_text()+(SOURCE/'nova-planner.css').read_text()).replace('__ASSETS__',json.dumps(assets).replace('<','\\u003c')).replace('__JOURNEY__',json.dumps(journey_html,ensure_ascii=False).replace('<','\\u003c')).replace('__ORIGINAL__',json.dumps(portal,ensure_ascii=False).replace('<','\\u003c')).replace('__JS__',js.replace('</script','<\\/script'))
(ROOT/'index.html').write_text(html)
print('Built index.html:',len(html.encode()),'bytes')
