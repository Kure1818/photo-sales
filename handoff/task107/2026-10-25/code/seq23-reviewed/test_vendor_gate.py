"""Negative vendor gate checks: source packaging refuses historical ABI vendor."""
import sys,unittest,tempfile,hashlib
from pathlib import Path
source,old=sys.argv[1:];sys.argv=[sys.argv[0]]
sys.path.insert(0,source)
import source_bundle
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_vendor
class Tests(unittest.TestCase):
 def test_historical_vendor_rejected_before_export(self):
  p=Path(old);h=hashlib.sha256((p/"DEPENDENCY-PINS.json").read_bytes()).hexdigest()
  with tempfile.TemporaryDirectory() as d:
   out=Path(d)/"bundle"
   with self.assertRaisesRegex(ValueError,"LambdaCompatibleVendorRequired"):
    source_bundle.assemble("operator",out,p,h)
   self.assertFalse(out.exists())
 def test_wrong_wheel_rejected_before_copy(self):
  with tempfile.TemporaryDirectory() as d:
   r=Path(d);w=r/"wrong.whl";w.write_bytes(b"wrong")
   with self.assertRaisesRegex(ValueError,"WheelPin"):build_vendor.build(old,w,r/"new")
   self.assertFalse((r/"new").exists())
if __name__=="__main__":unittest.main(verbosity=2)
