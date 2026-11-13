from pathlib import Path
import json,base64,mimetypes,hashlib,struct,zlib
root=Path(__file__).parent
bank=json.loads((root/'dist/questions.json').read_text())
for q in bank:
 if q['image']:
  p=root/'dist'/q['image'];q['image']='data:'+mimetypes.guess_type(p)[0]+';base64,'+base64.b64encode(p.read_bytes()).decode()
s=(root/'src/index.html').read_text().replace('/* STYLES */',(root/'src/styles.css').read_text()).replace('/* BANK */',json.dumps(bank).replace('</','<\\/')).replace('/* CORE */',(root/'src/core.js').read_text()).replace('/* APP */',(root/'src/app.js').read_text()).replace('/* PWA */',(root/'src/pwa.js').read_text())
(root/'dist/index.html').write_text(s)
print(f'Built standalone app: {len(bank)} questions, {len(s):,} characters')

manifest={"id":"./","name":"Peach State: Georgia driving study","short_name":"Peach State","description":"330 Georgia DDS practice questions with offline study and saved mistake review.","start_url":"./","scope":"./","display":"standalone","background_color":"#f6f5f0","theme_color":"#152d35","icons":[{"src":"./icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},{"src":"./icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
(root/'dist/manifest.webmanifest').write_text(json.dumps(manifest,indent=2))
# A simple road icon, with artwork inside the maskable safe area.
def icon(size):
 def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
 rows=[]
 for y in range(size):
  row=bytearray()
  for x in range(size):
   xx=x/size;yy=y/size;color=(21,45,53)
   if (xx-.5)**2+(yy-.5)**2<.33**2:
    color=(231,189,102)
    if .26<yy<.76 and abs(xx-(.5+.07*(.5-yy)))<(.055+.08*(yy-.26)):color=(21,45,53)
    if .29<yy<.74 and abs(xx-(.5+.07*(.5-yy)))<.009 and int(yy*18)%2==0:color=(246,245,240)
   row.extend(color)
  rows.append(b'\x00'+bytes(row))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
 (root/'dist'/name).write_bytes(icon(size))
version=hashlib.sha256((s+json.dumps(manifest)+(root/'src/sw.js').read_text()).encode()).hexdigest()[:16]
(root/'dist/sw.js').write_text((root/'src/sw.js').read_text().replace('/* VERSION */',version))
(root/'dist/.nojekyll').touch()
print('Built installable offline app, cache version '+version)
