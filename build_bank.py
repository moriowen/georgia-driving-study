from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlparse
import hashlib,json,subprocess,concurrent.futures,sys
ROOT=Path(__file__).parent
class Images(HTMLParser):
 def __init__(self): super().__init__();self.images=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='img' and a.get('src'): self.images.append(a['src'])
p=Images()
if (ROOT/'sources/manual.html').exists():
 p.feed((ROOT/'sources/manual.html').read_text())
else:
 p.images=list(json.loads((ROOT/'sources/assets.json').read_text()).values())
stable_ids=json.loads((ROOT/'sources/question_ids.json').read_text())
qs=[];downloads={}
sections={'Roundabouts and markings':7,'Right of way':5,'Turns and lane changes':5,'Passing':5,'School buses and emergency vehicles':5,'Speed and following distance':5,'Parking and backing':5,'Railroad crossings':5,'Work zones':5,'Visibility and weather':8,'Expressways and defensive driving':8,'Sharing the road':9,'Impairment and distractions':5,'Occupants and vehicle safety':5,'Crashes and police stops':11,'Licensing and responsibilities':6}
for file,kind in [('rules.txt','rules'),('signs.txt','signs')]:
 category=''
 for line in (ROOT/'sources'/file).read_text().splitlines():
  if not line:continue
  if line.startswith('## '):category=line[3:];continue
  parts=line.split('|');image=None
  if kind=='signs':
   prefix=unquote(parts.pop(0)).lower()
   matches=[u for u in p.images if unquote(Path(urlparse(u).path).name).lower().startswith(prefix)]
   if len(matches)!=1: raise ValueError((prefix,matches))
   u=matches[0]; ext=Path(urlparse(u).path).suffix
   name=hashlib.sha256(u.encode()).hexdigest()[:12]+ext
   image='assets/'+name;downloads[name]=u
  q,a,b,c,e=parts
  qid=stable_ids[len(qs)] if len(qs)<len(stable_ids) else hashlib.sha256((kind+q+(image or '')).encode()).hexdigest()[:12]
  section=7 if kind=='signs' else sections[category]
  if category=='Licensing and responsibilities':
   section=10 if any(w in q for w in ['point','suspension','revocation']) else 6
  qs.append(dict(id=qid,revision=2,kind=kind,category=category,prompt=q,options=[a,b,c],answer=0,explanation=e,image=image,source='https://dds.georgia.gov/drivers-manual',reference=f'DDS driver manual: {category}'))
assert len({q['id'] for q in qs})==len(qs)
(ROOT/'dist/questions.json').write_text(json.dumps(qs,indent=2))
(ROOT/'dist/assets').mkdir(exist_ok=True)
def download(item):
 name,url=item;path=ROOT/'dist/assets'/name
 if path.exists() and path.stat().st_size>100:return
 subprocess.run(['curl','-fsSL','--retry','2',url,'-o',str(path)],check=True,capture_output=True)
if '--download' in sys.argv:
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(download,downloads.items()))
(ROOT/'sources/assets.json').write_text(json.dumps(downloads,indent=2))
print(json.dumps({'questions':len(qs),'rules':sum(q['kind']=='rules' for q in qs),'signs':sum(q['kind']=='signs' for q in qs),'assets':len(downloads)}))
