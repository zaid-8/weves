"""Fixed-source image proxy and disk-cache checks, with no network/server sockets."""
from pathlib import Path
from unittest.mock import patch
from tempfile import TemporaryDirectory
from io import BytesIO
from types import SimpleNamespace
import importlib.util
import unittest
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT))
spec=importlib.util.spec_from_file_location('aethra_launcher',ROOT/'start.py')
app=importlib.util.module_from_spec(spec);spec.loader.exec_module(app)
class TopographyProxy(unittest.TestCase):
    def request(self,path):
        handler=object.__new__(app.Handler);handler.path=path;handler.headers={'Host':'127.0.0.1:8765'};handler.server=SimpleNamespace(server_port=8765);handler.wfile=BytesIO();handler.send_response=lambda status:setattr(handler,'status',status);handler.send_header=lambda *args:None;handler.end_headers=lambda:None
        handler.do_GET();return handler.status,handler.wfile.getvalue()
    def test_cache_download_and_reuse(self):
        image=(ROOT/'assets/mars.jpg').read_bytes()
        with TemporaryDirectory() as tmp,patch.object(app,'ROOT',Path(tmp)):
            with patch.object(app,'urlopen',return_value=BytesIO(image)) as fetch:
                status,body=self.request('/api/image?key=topography');self.assertEqual(status,200);self.assertEqual(body,image);self.assertEqual(fetch.call_args.args[0].full_url,app.NASA_IMAGES['topography'])
            with patch.object(app,'urlopen',side_effect=AssertionError('Network not allowed')):
                status,body=self.request('/api/image?key=topography');self.assertEqual(status,200);self.assertEqual(body,image)
    def test_invalid_image_and_unknown_key(self):
        with TemporaryDirectory() as tmp,patch.object(app,'ROOT',Path(tmp)),patch.object(app,'urlopen',return_value=BytesIO(b'<html>unavailable</html>')):
            self.assertEqual(self.request('/api/image?key=topography')[0],503)
            self.assertFalse((Path(tmp)/'assets/mars-topography.jpg').exists())
            self.assertEqual(self.request('/api/image?key=https://example.com')[0],400)
if __name__=='__main__':unittest.main()
