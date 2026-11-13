from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import json
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import start

class ChatTests(unittest.TestCase):
 def request(self,path,body=None):
  h=object.__new__(start.Handler);h.path=path;h.headers={'Host':'127.0.0.1:8765'};h.server=SimpleNamespace(server_port=8765);h.wfile=BytesIO();h.send_response=lambda status:setattr(h,'status',status);h.send_header=lambda *a:None;h.end_headers=lambda:None
  if body is None:h.do_GET()
  else:
   raw=json.dumps(body).encode();h.headers['Content-Length']=str(len(raw));h.rfile=BytesIO(raw);h.do_POST()
  return h.status,json.loads(h.wfile.getvalue())
 def test_retired_endpoints_and_update_status(self):
  self.assertEqual(self.request('/api/mission/start',{})[0],404)
  self.assertEqual(self.request('/api/mission/publish',{})[0],404)
  with patch.object(start,'NASA_UPDATES',SimpleNamespace(snapshot=lambda:{'schema':1,'status':'cached','documents':[]})):
   status,data=self.request('/api/nasa-updates');self.assertEqual(status,200);self.assertEqual(data['status'],'cached')
 def test_server_injects_retrieved_evidence_and_returns_citations(self):
  captured=[];questions=[]
  evidence={'status':'cached','documents':[{'title':'Fixture Mars science update','url':'https://science.nasa.gov/test-fixture/','text':'Fixture only','publishedAt':'2026-11-13T10:00:00+00:00'}]}
  def context(q):questions.append(q);return evidence
  def ollama(path,body=None,timeout=8):
   if path=='/api/tags':return {'models':[{'name':'fixture-model'}]}
   captured.append(body);return {'message':{'content':'Fixture model answer'}}
  with patch.object(start,'NASA_UPDATES',SimpleNamespace(context=context)),patch.object(start,'ollama_json',side_effect=ollama):
   code,result=self.request('/api/chat',{'question':'Latest Mars news?','model':'fixture-model','context':'older local evidence'})
  self.assertEqual(code,200);self.assertEqual(questions,['Latest Mars news?']);self.assertEqual(result['nasaStatus'],'cached');self.assertEqual(result['sources'][0]['url'],evidence['documents'][0]['url'])
  messages=captured[0]['messages'];self.assertIn('Fixture only',messages[1]['content']);self.assertIn('Publication dates are not launch dates',messages[0]['content']);self.assertIn('not retrain',messages[0]['content'])

if __name__=='__main__':unittest.main()
