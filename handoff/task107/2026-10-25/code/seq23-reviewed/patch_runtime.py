"""Unissued source-only candidate. Explicit parent pins; no SDK or private access."""
import hashlib,json,shutil,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
def digest(b):return hashlib.sha256(b).hexdigest()
def inventory(root):
    result={}
    for p in root.rglob("*"):
        if p.is_symlink():raise ValueError("Symlink")
        if p.is_file():result[p.relative_to(root).as_posix()]=dict(bytes=p.stat().st_size,sha256=digest(p.read_bytes()))
    return result
def replace(p,a,b):
    t=p.read_text()
    if t.count(a)!=1:raise ValueError("PatchCount:"+p.name)
    p.write_text(t.replace(a,b))
def apply(source,out):
    source,out=Path(source),Path(out)
    expected=json.loads((HERE/"PARENT-SOURCE-PINS.json").read_bytes())
    if inventory(source)!=expected:raise ValueError("SourceParent")
    if out.exists():raise ValueError("FreshOutput")
    shutil.copytree(source,out)
    replace(out/"remote_main.py",
        'sha(canonical(stage_pin())),factory,args.work)',
        'source_digest(stage_pin()),factory,args.work)')
    helper='''def source_digest(summary):
 if type(summary) is not dict or set(summary)!={"files","canonicalSHA256"}:
  raise ValueError("SourceSummaryShape")
 count=summary["files"];value=summary["canonicalSHA256"]
 if type(count) is not int or count<=0 or type(value) is not str or len(value)!=64 or any(x not in "0123456789abcdef" for x in value):
  raise ValueError("SourceSummaryDigest")
 return value
'''
    replace(out/"readonly_capability.py","def scope_hash(p,raws):",helper+"def scope_hash(p,raws):")
    replace(out/"readonly_capability.py",'sha(canonical(stage_pin()))','source_digest(stage_pin())')
    replace(out/"remote_main.py",'from readonly_capability import canonical,sha','from readonly_capability import canonical,sha,source_digest')
    # Exact request is armed ONLY by the known readiness loop, after StartBuild.
    replace(out/"main_operation.py",
        'r=None\n        for attempt in range(24):',
        '''r=None
        readiness_request=dict(Bucket=bucket,Key=key,ExpectedBucketOwner=self.scope["account"])
        proxy=self.backend["s3"]
        if hasattr(type(proxy),"expect_readiness"):
            proxy.expect_readiness(readiness_request)
        for attempt in range(24):''')
    replace(out/"setup_journal.py",
        'self.deadline=deadline;self.n=0;',
        'self.expected_readiness=None;self.readiness_armed=False\n        self.deadline=deadline;self.n=0;')
    replace(out/"setup_journal.py",'self.live()\n            return result',
        '''self.live()
            if group=="operation" and service=="s3" and method=="get_object" and request==self.expected_readiness:
                self.expected_readiness=None
            return result''')
    replace(out/"setup_journal.py",
        'except BaseException as e:\n            self.failed=True',
        '''except BaseException as e:
            error=getattr(e,"response",{})
            if (self.expected_readiness is not None and group=="operation" and service=="s3" and method=="get_object"
                and request==self.expected_readiness and error.get("Error",{}).get("Code")=="NoSuchKey"
                and error.get("ResponseMetadata",{}).get("HTTPStatusCode")==404):
                try:
                    self.live()
                    self.record("api-expected-missing",dict(intent,errorCode="NoSuchKey",http=404))
                except BaseException:
                    self.failed=True
                    raise
                raise
            self.failed=True''')
    replace(out/"setup_journal.py",
        'def __init__(self,name):self.name=name',
        '''def __init__(self,name):self.name=name
            def expect_readiness(self,request):
                outer.live()
                need(group=="operation" and self.name=="s3" and not outer.readiness_armed,"ReadinessArmOnce")
                need(set(request)=={"Bucket","Key","ExpectedBucketOwner"} and all(type(v) is str and v for v in request.values()),"ReadinessRequest")
                outer.readiness_armed=True
                outer.expected_readiness=dict(request)''')
    replace(out/"setup_journal.py",
        'if r["kind"]=="api-return":',
        'if r["kind"] in ("api-return","api-expected-missing"):')
    after=inventory(out)
    if set(after)!=set(expected):raise ValueError("SourceSetChanged")
    (out.parent/(out.name+"-DIFF.json")).write_text(json.dumps({n:dict(before=expected[n],after=v) for n,v in after.items() if expected[n]!=v},sort_keys=True,indent=2)+"\n")
if __name__=="__main__":apply(*sys.argv[1:])
