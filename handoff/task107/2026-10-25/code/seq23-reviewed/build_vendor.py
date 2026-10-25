"""Offline candidate vendor only. Requires externally obtained pinned wheel."""
import hashlib,json,shutil,sys,zipfile,stat,subprocess,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
def build(old,wheel,out):
 old,wheel,out=map(Path,(old,wheel,out))
 if old.is_symlink() or any(p.is_symlink() for p in old.rglob("*")):raise ValueError("VendorSymlink")
 if out.resolve().is_relative_to(old.resolve()):raise ValueError("OutputUnderParent")
 p=json.loads((HERE/"LAMBDA-WHEEL-PIN.json").read_bytes());b=wheel.read_bytes()
 if len(b)!=p["bytes"] or sha(b)!=p["sha256"]:raise ValueError("WheelPin")
 pinsraw=(old/"DEPENDENCY-PINS.json").read_bytes()
 expected=(HERE/"VENDOR-PARENT-SHA.txt").read_text().strip()
 if sha(pinsraw)!=expected:raise ValueError("VendorParent")
 pins=json.loads(pinsraw)
 actual={p.relative_to(old).as_posix() for p in old.rglob("*") if p.is_file()}
 if actual!=set(pins["files"])|{"DEPENDENCY-PINS.json"}:raise ValueError("VendorSet")
 for n,v in pins["files"].items():
  q=old/n;b=q.read_bytes()
  if q.is_symlink() or len(b)!=v["bytes"] or sha(b)!=v["sha256"]:raise ValueError("VendorFile")
 if out.exists():raise ValueError("FreshOutput")
 shutil.copytree(old,out)
 for name in ("cryptography","cryptography-50.0.2.dist-info"):
  shutil.rmtree(out/name)
 with zipfile.ZipFile(wheel) as z:
  if z.testzip() is not None:raise ValueError("CRC")
  if len(z.namelist())!=len(set(z.namelist())):raise ValueError("DuplicateMember")
  for i in z.infolist():
   p=Path(i.filename);mode=i.external_attr>>16
   if p.is_absolute() or ".." in p.parts or stat.S_IFMT(mode) not in (0,stat.S_IFREG,stat.S_IFDIR) or p.parts[0] not in ("cryptography","cryptography-50.0.2.dist-info"):
    raise ValueError("WheelMember")
   if i.is_dir():continue
   q=out/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(z.read(i))
 # Inspect every native library, not just cryptography. AL2 glibc floor2.26.
 report={}
 for q in out.rglob("*.so"):
  elf=subprocess.check_output(["readelf","-h",str(q)],text=True)
  if "Advanced Micro Devices X86-64" not in elf or "ELF64" not in elf:raise ValueError("ELFArchitecture")
  info=subprocess.check_output(["readelf","--version-info",str(q)],text=True)
  versions=sorted(set(re.findall(r"GLIBC_(\d+\.\d+(?:\.\d+)?)",info)))
  if any(tuple(map(int,v.split(".")))>(2,26) for v in versions):raise ValueError("GLIBCTooNew")
  report[q.relative_to(out).as_posix()]=versions
 pins["files"]={p.relative_to(out).as_posix():dict(bytes=p.stat().st_size,sha256=sha(p.read_bytes()))
   for p in sorted(out.rglob("*")) if p.is_file() and p.name!="DEPENDENCY-PINS.json"}
 raw=(json.dumps(pins,sort_keys=True,indent=2)+"\n").encode();(out/"DEPENDENCY-PINS.json").write_bytes(raw)
 print(json.dumps(dict(vendorSHA=sha(raw),files=len(pins["files"]),ELF=report,realLambdaVerified=False),sort_keys=True))
if __name__=="__main__":build(*sys.argv[1:])
