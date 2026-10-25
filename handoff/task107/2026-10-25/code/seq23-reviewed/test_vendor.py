"""Actual candidate native import + RFC8032 verification; no signing or AWS."""
import sys,hashlib,json,unittest
from pathlib import Path
vendor=Path(sys.argv.pop(1))
raw=(vendor/"DEPENDENCY-PINS.json").read_bytes()
assert hashlib.sha256(raw).hexdigest()=="267e828c767dad5f8ddf2d6d41004107c67ff7fb8e3b632e800e44329d063c95"
for n,v in json.loads(raw)["files"].items():
 b=(vendor/n).read_bytes();assert len(b)==v["bytes"] and hashlib.sha256(b).hexdigest()==v["sha256"]
sys.path.insert(0,str(vendor))
def audit(event,args):
 if event.startswith("socket.") or event in ("subprocess.Popen","os.system"):raise RuntimeError("SDK0")
sys.addaudithook(audit)
import cryptography
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
class Tests(unittest.TestCase):
 def test_fixed_version_and_origin(self):
  self.assertEqual(cryptography.__version__,"50.0.2")
  self.assertTrue(Path(cryptography.__file__).resolve().is_relative_to(vendor.resolve()))
 def test_native_ed25519_verify(self):
  key=Ed25519PublicKey.from_public_bytes(bytes.fromhex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"))
  sig=bytes.fromhex("e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b")
  key.verify(sig,b"")
  with self.assertRaises(InvalidSignature):key.verify(sig,b"changed")
if __name__=="__main__":unittest.main(verbosity=2)
