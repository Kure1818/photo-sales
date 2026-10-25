"""New delta only; no SDK, source private data, reservation or signature."""
import sys,unittest,tempfile,hashlib,json,types,time
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,sys.argv.pop(1))
import readonly_capability as cap,setup_journal as sj
def audit(event,args):
 if event.startswith("socket.") or event in ("subprocess.Popen","os.system"):raise RuntimeError("SDK0")
sys.addaudithook(audit)
class Missing(Exception):
 def __init__(self,code="NoSuchKey",http=404):
  self.response={"Error":{"Code":code},"ResponseMetadata":{"HTTPStatusCode":http}}
class Backend:
 def __init__(self,error):self.error=error
 def get_object(self,**request):
  if self.error:raise self.error
  return {"ResponseMetadata":{"HTTPStatusCode":200}}
class Tests(unittest.TestCase):
 def test_digest_actual_shape(self):
  h="a407d3be6da16ed70492ade0ff7734cf68152d68c0f6094ce5d925302972ac15"
  summary=dict(files=1270,canonicalSHA256=h)
  self.assertEqual(cap.source_digest(summary),h)
  self.assertNotEqual(cap.sha(cap.canonical(summary)),h)
 def test_digest_bad(self):
  for s in ({},dict(files=True,canonicalSHA256="0"*64),dict(files=0,canonicalSHA256="0"*64),
            dict(files=1,canonicalSHA256="G"*64),dict(files=1,canonicalSHA256=b"0"*64)):
   with self.subTest(s=s),self.assertRaises(ValueError):cap.source_digest(s)
 def test_runtime_verify_uses_same_digest(self):
  h="a407d3be6da16ed70492ade0ff7734cf68152d68c0f6094ce5d925302972ac15"
  bound=types.SimpleNamespace(v=dict(sourcePinsSHA=h,scopeSHA="scope",jobARN="job"),raws={},check=lambda *a:True)
  receipt=types.SimpleNamespace(stage_pin=lambda:dict(files=1270,canonicalSHA256=h))
  with patch.dict(sys.modules,main_receipt=receipt),patch.object(cap,"_bound",bound),patch.object(cap,"BUILD_ROOT","fixture"),\
       patch.object(cap,"_current_scope","scope"),patch.object(cap,"_immutable_scope","immutable"),\
       patch.object(cap,"scope_hash",return_value="scope"),patch.object(cap,"immutable_scope",return_value="immutable"):
   self.assertTrue(cap.verify({}, {},time.time()))
   receipt.stage_pin=lambda:dict(files=1270,canonicalSHA256="0"*64)
   with self.assertRaisesRegex(ValueError,"RuntimeSource"):cap.verify({}, {},time.time())
 def flow(self,case):
  with tempfile.TemporaryDirectory() as d:
   j=sj.Journal(Path(d)/"journal",{},100,clock=lambda:1,mono=lambda:1)
   self.addCleanup(j.close)
   backend=Backend(Missing())
   proxy=j.clients({"s3":backend},"operation",40,{("s3","get_object")})["s3"]
   request=dict(Bucket="bucket",Key="owned/GEN/readiness/NONCE.json",ExpectedBucketOwner="owner")
   if case!="unarmed":proxy.expect_readiness(request)
   if case=="rearm":
    with self.assertRaises(ValueError):proxy.expect_readiness(request)
    return
   if case=="otherkey":request=dict(request,Key="different")
   if case=="denied":backend.error=Missing("AccessDenied",403)
   if case=="unknown":backend.error=TimeoutError()
   if case=="wronghttp":backend.error=Missing("NoSuchKey",500)
   if case=="cap":j.counts["operation"]=40
   with self.assertRaises(Exception):proxy.get_object(**request)
   if case=="ok":
    self.assertFalse(j.failed);self.assertEqual(j.counts["operation"],1)
    self.assertEqual(sj.inspect(j.root)["unknown"],[])
    backend.error=None;proxy.get_object(**request)
    self.assertIsNone(j.expected_readiness);self.assertEqual(j.counts["operation"],2)
    backend.error=Missing()
    with self.assertRaises(Missing):proxy.get_object(**request)
    self.assertTrue(j.failed)
   elif case!="cap":self.assertTrue(j.failed)
   else:self.assertEqual(j.counts["operation"],40)
 def test_expected_then_success_then_missing(self):self.flow("ok")
 def test_unarmed(self):self.flow("unarmed")
 def test_other_key(self):self.flow("otherkey")
 def test_access_denied(self):self.flow("denied")
 def test_unknown(self):self.flow("unknown")
 def test_wrong_http(self):self.flow("wronghttp")
 def test_rearm(self):self.flow("rearm")
 def test_cap40(self):self.flow("cap")
 def test_clock_expiry(self):
  with tempfile.TemporaryDirectory() as d:
   j=sj.Journal(Path(d)/"journal",{},100,clock=lambda:1,mono=lambda:1)
   self.addCleanup(j.close);j.clock=lambda:101
   with self.assertRaises(ValueError):j.live()
 def test_foreign_process(self):
  with tempfile.TemporaryDirectory() as d:
   j=sj.Journal(Path(d)/"journal",{},100,clock=lambda:1,mono=lambda:1)
   self.addCleanup(j.close);j.pid=-1
   proxy=j.clients({"s3":Backend(None)},"operation",40,{("s3","get_object")})["s3"]
   with self.assertRaises(ValueError):
    proxy.expect_readiness(dict(Bucket="bucket",Key="key",ExpectedBucketOwner="owner"))
if __name__=="__main__":unittest.main(verbosity=2)
