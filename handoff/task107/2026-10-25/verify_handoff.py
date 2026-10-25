#!/usr/bin/env python3
"""Read-only handoff validator; never extracts, runs payload code, signs or calls a network."""
from pathlib import Path
import hashlib,json,sys,zipfile
root=Path(sys.argv[1] if len(sys.argv)>1 else "private-transfer").resolve()
manifest=json.loads((root/"MANIFEST.json").read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
for n,v in manifest["files"].items():
 p=root/n
 if p.is_symlink() or not p.is_file() or p.stat().st_size!=v["bytes"] or sha(p)!=v["sha256"]:raise SystemExit("MISMATCH: "+n)
for n in ["seq23-next-review.zip","MAIN-seq23-independent-preflight-evidence.zip","MAIN-seq23-closed-checkpoint.zip"]:
 with zipfile.ZipFile(root/"payload"/n) as z:
  if z.testzip() is not None:raise SystemExit("CRC: "+n)
  pin_names=[x for x in z.namelist() if x=="PINS.json"]
  if pin_names:
   pins=json.loads(z.read("PINS.json"))
   for k,v in pins.items():
    b=z.read(k)
    if len(b)!=v["bytes"] or hashlib.sha256(b).hexdigest()!=v["sha256"]:raise SystemExit("PIN: "+n+"/"+k)
print("HANDOFF VERIFIED: "+str(len(manifest["files"]))+" files; no execution, no reservation, no issue/run.")
