"""Download the referenced NASA photos, then rebuild the portable HTML.

Run once with internet access: python download-mars-images.py
No image processing is applied. Existing successful downloads are retained.
"""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlparse
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
media = json.loads((ROOT / 'source/journey-media.json').read_text())
topography = {'topography': {'url': 'https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004436/mars_cyl_topo2.jpg', 'source': 'https://svs.gsfc.nasa.gov/4436/', 'file': 'mars-topography.jpg'}}
media = topography if '--topography-only' in sys.argv else {**media, **topography}
failed = []
for key, item in media.items():
    path = ROOT / 'assets' / item['file']
    if path.exists() and path.read_bytes().startswith(b'\xff\xd8\xff'):
        print('Already saved:', item['file'])
        continue
    try:
        host = urlparse(item['url']).hostname or ''
        if not host.endswith('.nasa.gov'):
            raise ValueError('Expected an official NASA image host')
        request = Request(item['url'], headers={'User-Agent': 'AETHRA-Educational-Mars-Image-Downloader/1.0'})
        with urlopen(request, timeout=30) as response:
            body = response.read(12 * 1024 * 1024 + 1)
        if len(body) > 12 * 1024 * 1024 or not body.startswith(b'\xff\xd8\xff'):
            raise ValueError('Download was not a JPEG within the 12 MiB limit')
        temporary = path.with_suffix('.part')
        temporary.write_bytes(body)
        temporary.replace(path)
        print('Saved:', item['file'], len(body), 'bytes')
    except Exception as error:
        failed.append(key)
        print('Could not download', item['file'], ':', error)
        print('NASA reference:', item['source'])

subprocess.run([sys.executable, str(ROOT / 'build.py')], cwd=ROOT, check=True)
if failed:
    print('The HTML was rebuilt. Missing photos still require a connection:', ', '.join(failed))
    sys.exit(1)
print('All selected NASA images are embedded in index.html for offline use.')
