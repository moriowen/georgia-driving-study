from pathlib import Path
import json,base64,mimetypes
root=Path(__file__).parent
bank=json.loads((root/'dist/questions.json').read_text())
for q in bank:
 if q['image']:
  p=root/'dist'/q['image'];q['image']='data:'+mimetypes.guess_type(p)[0]+';base64,'+base64.b64encode(p.read_bytes()).decode()
s=(root/'src/index.html').read_text().replace('/* STYLES */',(root/'src/styles.css').read_text()).replace('/* BANK */',json.dumps(bank).replace('</','<\\/')).replace('/* CORE */',(root/'src/core.js').read_text()).replace('/* APP */',(root/'src/app.js').read_text())
(root/'dist/index.html').write_text(s)
print(f'Built standalone app: {len(bank)} questions, {len(s):,} characters')
