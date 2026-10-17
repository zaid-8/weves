from pathlib import Path
import importlib.util
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json, threading, unittest, io
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('marswalk_server',Path(__file__).resolve().parents[1]/'start.py')
app=importlib.util.module_from_spec(spec);spec.loader.exec_module(app)

class MockOllama(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def send_json(self,obj):
        data=json.dumps(obj).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
    def do_GET(self):self.send_json({'models':[{'name':'test-model:local'}]})
    def do_POST(self):
        data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert data['stream'] is False
        assert data['model']=='test-model:local'
        assert 'Only NASA sources' in data['messages'][0]['content']
        assert '2.19 km archived NASA record' in data['messages'][1]['content']
        self.send_json({'message':{'content':'Mock local answer: this is an archived NASA record.'}})

class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mock=ThreadingHTTPServer(('127.0.0.1',0),MockOllama)
        app.OLLAMA=f'http://127.0.0.1:{cls.mock.server_port}'
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        for s in [cls.mock,cls.server]:threading.Thread(target=s.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls):
        for s in [cls.mock,cls.server]:s.shutdown();s.server_close()
    def request(self,path,body=None,headers=None):
        h={'Content-Type':'application/json'};h.update(headers or {})
        req=Request(self.url+path,data=None if body is None else json.dumps(body).encode(),headers=h)
        try:
            with urlopen(req,timeout=5) as r:return r.status,r.read()
        except HTTPError as e:return e.code,e.read()
    def test_shell(self):
        s,b=self.request('/');self.assertEqual(s,200);self.assertIn(b'AETHRA',b);self.assertIn(b'data:image/jpeg;base64',b)
    def test_installed_models(self):
        s,b=self.request('/api/models');self.assertEqual(s,200);self.assertEqual(json.loads(b)['models'],['test-model:local'])
    def test_grounded_local_chat_protocol(self):
        s,b=self.request('/api/chat',{'question':'My route?','context':'2.19 km archived NASA record','model':'test-model:local'});self.assertEqual(s,200);self.assertEqual(json.loads(b)['mode'],'local-generation')
    def test_unknown_model_is_not_downloaded(self):
        s,b=self.request('/api/chat',{'question':'Hello','context':'','model':'not-installed'});self.assertEqual(s,400)
    def test_bad_input_and_foreign_origin(self):
        self.assertEqual(self.request('/api/chat',{'question':[]})[0],400)
        self.assertEqual(self.request('/api/chat',{'question':'Hi'},{'Origin':'https://unrelated.example'})[0],403)
    def test_nasa_image_catalog(self):
        self.assertEqual(self.request('/api/image?key=https://unrelated.example')[0],400)
        with patch.object(app,'urlopen',return_value=io.BytesIO(b'\xff\xd8test-image')):
            status,data=self.request('/api/image?key=panorama')
        self.assertEqual(status,200);self.assertTrue(data.startswith(b'\xff\xd8'))
        with patch.object(app,'urlopen',return_value=io.BytesIO(b'not an image')):
            self.assertEqual(self.request('/api/image?key=mineral')[0],503)
    def test_disconnected_local_model(self):
        old=app.OLLAMA;app.OLLAMA='http://127.0.0.1:1'
        try:self.assertEqual(self.request('/api/models')[0],503)
        finally:app.OLLAMA=old

if __name__=='__main__':unittest.main(verbosity=2)
