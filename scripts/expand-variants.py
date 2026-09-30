"""Merge saved, visible variant observations without changing product identities.
Usage: python3 scripts/expand-variants.py /path/to/observations-directory
"""
import json, re, sys, copy
from pathlib import Path
from decimal import Decimal
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]; evidence=Path(sys.argv[1])
read=lambda p: json.loads(p.read_text())
lines=lambda p: [json.loads(s) for s in p.read_text().splitlines() if s.strip()]
cat=read(root/'data/catalogue.json'); audit=read(evidence/'variant-audit.json')
rows={x['sku']:x for x in lines(evidence/'variant-expansion.ndjson') if re.search(r'CHF\s+[\d,]+\.\d{2}',x['offer'])}
pricing={x['sku']:x for x in read(root/'research/supplier-pricing.json')}
colors={'Black':'Schwarz','White':'Weiss','Grey':'Grau','Gray':'Grau','Metallic Gray':'Metallic-Grau','Blue':'Blau','Purple':'Violett','Pink':'Rosa','Silver':'Silber','Silver Grey':'Silbergrau','Transparent Black':'Transparent Schwarz','Transparent Blue':'Transparent Blau','Orange':'Orange','Beige':'Beige','Red':'Rot','Yellow':'Gelb','Purple Blue':'Violett/Blau','Black / Red Trackball':'Schwarz / roter Trackball'}
def color(t):
 t=t.strip()
 return colors.get(t,' / '.join(colors.get(c.strip(),c.strip()) for c in t.split('/')))
def axes(p,x):
 title=x['title']; suffix=title.split(' - ')[-1].strip() if ' - ' in title else ''
 if p['category']=='handhelds':
  hw=(x['selectedHardware'] or [title])[0]
  if p['id']=='h023':return p['variants'][0]['hardware'],color(suffix)
  if p['id']=='h030':return f'3 GB / 32 GB · {hw.replace("G", " GB")}-Ausführung',color(suffix)
  if p['id']=='h048':
   ram,storage=re.search(r'(8|12)GB\+(128|256)GB',title).groups()
   m=re.search(r'with (\d+)G(?:B)? (?:TF )?Card',title,re.I)
   return f'{ram} GB / {storage} GB / '+(f'{m[1]} GB TF-Karte' if m else 'ohne TF'),color(suffix)
  m=re.search(r'with (\d+)G(?:B)? (?:TF )?Card',hw,re.I) or re.search(r'with (\d+)G(?:B)? (?:TF )?Card',title,re.I)
  if not m:raise ValueError(('Unknown hardware',x['sku'],hw))
  base={'h001':'','h005':'','h008':'','h011':'','h022':'32 GB / ','h033':'8 GB / 128 GB / ','h035':'8 GB / 128 GB / ','h038':'8 GB / 128 GB / ','h043':'8 GB / 128 GB / ','h050':'12 GB / 256 GB / '}[p['id']]
  return base+f'{m[1]} GB TF-Karte',color(suffix)
 if p['id']=='002':return x['selectedHardware'][0].replace('m',' m'),color(suffix)
 if p['category']=='beamer':
  m=re.search(r'(EU|US|UK|AU) Plug',title)
  return (m[1]+'-Stecker' if m else 'Standard'),(color(suffix.split('/')[0]) if '/' in suffix else '')
 if p['id']=='141':return {'English':'Englisches Layout','Arabic':'Arabisches Layout'}[suffix],''
 if p['id']=='142':return {'Cyan Switch':'Cyan-Schalter','Red Switch':'Rote Schalter'}[suffix],''
 return 'Standard',color(suffix)
def base_title(p):
 a=next(x for x in audit if x['id']==p['id'])
 return a['offer'].split('Customization\n')[-1].split('\nItem No.')[0].strip().split('\n')[0]
def shipping(x):
 opts=[]
 for method,cost,duration in x['shipping']:
  m=re.fullmatch(r'(\d+)\s*-\s*(\d+)\s+(calendar days|business days?)',duration.strip());assert m,(x['sku'],duration)
  opts.append({'method':method.strip(),'costMinor':int(Decimal(cost.removeprefix('CHF ').replace(',',''))*100),'days':[int(m[1]),int(m[2])],'dayType':'business' if m[3].startswith('business') else 'calendar'})
 assert opts and 'Switzerland' in x['quote'] and x['sku'] in x['offer']
 m=re.search(r'Estimated Processing Time:\s*(\d+)\s*-\s*(\d+) days',x['offer'])
 return {'country':'CH','currency':'CHF','quantity':int(x['quantity']),'checkedAt':x['checkedAt'][:10],'complete':True,'processingDays':[int(m[1]),int(m[2])] if m else None,'options':opts}
for p in cat['products']:
 original=copy.deepcopy(p['details'])
 if p['category']=='beamer':p['name']=p['name'].replace(', EU;',';')
 if p['id']=='002':p['name']='ESSAGER C–C, 100 W'
 if p['id'] in ['078','086']:p['name']=p['name'].replace(', weiss','')
 if p['id']=='141':p['name']=p['name'].replace(', Englisch','')
 for v in p['variants']:
  if p['category']!='handhelds' and 'hardware' not in v:
   title=base_title(p); suffix=title.split(' - ')[-1] if ' - ' in title else ''
   fake={'title':title,'selectedHardware':['0.25m']}
   v['hardware'],v['color']=axes(p,fake)
   if p['id']=='122':v['color']='Schwarz / schwarzer Trackball'
 for x in [x for x in rows.values() if x['productId']==p['id']]:
  if any(v['sku']==x['sku'] for v in p['variants']):continue
  cost=int(Decimal(re.search(r'CHF\s+([\d,]+\.\d{2})',x['offer'])[1].replace(',',''))*100)
  source=next((url for url in x['images'] if f'800x800_{x["sku"]}-1.webp'.lower() in url.lower()),None);assert source,x['sku']
  hw,co=axes(p,x);quote=shipping(x)
  v={'name':p['name'],'sku':x['sku'],'source':x['source'],'priceMinor':cost+2000,'shipping':quote,'image':'/assets/shop/'+x['sku'].lower()+'.webp','imageSource':source,'hardware':hw,'color':co}
  p['variants'].append(v)
  pricing[x['sku']]={'sku':x['sku'],'source':x['source'],'checkedAt':x['checkedAt'][:10],'currency':'CHF','purchasePriceMinor':cost,'markupMinor':2000,'priceMinor':cost+2000,'quoteQuantity':quote['quantity'],'shippingOptions':quote['options']}
 for v in p['variants']:
  v['name']=' · '.join([p['name']]+([v['hardware']] if v['hardware']!='Standard' else [])+([v['color']] if v.get('color') else []))
  d=copy.deepcopy(original)
  d['specifications']=[s for s in d['specifications'] if s[0] not in ['Farbe','Ausführung','Stecker']]
  if v.get('color'):d['specifications'].append(['Farbe',v['color']])
  if p['category']=='beamer':d['specifications'].append(['Netzstecker',v['hardware']])
  if p['id']=='002':
   d['specifications']=[s for s in d['specifications'] if s[0]!='Länge'];d['specifications'].append(['Länge',v['hardware'].replace('.',',')])
   d['paragraphs']=['USB-C-Ladekabel mit geflochtener Nylonhülle und E-Marker für Handhelds, Smartphones und Notebooks mit passendem USB-PD-Netzteil.']
  if p['id']=='141':
   d['paragraphs']=['Dreifach faltbare Bluetooth-Tastatur für mobile Setups. Die berührungsempfindliche Fläche kann als Touchpad oder Zahlenblock dienen. Ein Schweizer Layout ist nicht ausgewiesen.'];d['specifications']=[s for s in d['specifications'] if s[0]!='Layout']+[['Layout',v['hardware']]]
  if p['id']=='142':
   d['paragraphs']=['Kompakte mechanische Tastatur mit abnehmbarem USB-Kabel und austauschbaren Schaltern. Die eisblaue Beleuchtung bietet mehrere Effekte. Ein Schweizer Tastenlayout ist nicht bestätigt.'];d['specifications']=[s for s in d['specifications'] if s[0]!='Schalter']+[['Schalter',v['hardware']]]
  if p['category']=='handhelds' and v['sku'] in rows:
   # Base copy describes the card-free version; retain technical facts, replace bundle claims.
   replacements=[r' Die Ausführung wird als .*',r' Die Angebotsausführung nennt .*',r' Der Titel nennt .*',r' Diese Ausführung enthält .*',r'; eine zusätzliche TF-Karte ist nicht enthalten\.',r' Eine TF-Karte ist in dieser Ausführung nicht enthalten\.',r' Eine TF-Karte ist nicht enthalten\.',r'; die zusätzliche TF-Karte gehört nicht zum Angebot\.',r'; eine TF-Karte ist separat erforderlich\.',r' Spiele gehören laut Titel nicht zu dieser Ausführung\.']
   for pattern in replacements:d['paragraphs']=[re.sub(pattern,'.' if pattern.startswith(';') else '',s) for s in d['paragraphs']]
   d['included']=[s.replace('; Speicherkarte nicht bestätigt','') for s in d['included']]
   m=re.search(r'(\d+) GB TF-Karte',v['hardware'])
   if m:d['included'].append(m[1]+'-GB-TF-Speicherkarte');d['specifications'].append(['Speicherkarte',m[1]+' GB TF'])
   if p['id']=='h030':d['specifications'].append(['Speicherpaket',v['hardware'].split(' · ')[-1]])
   if p['id']=='h048':
    ram,storage=re.match(r'(\d+) GB / (\d+) GB',v['hardware']).groups();d['specifications']=[s for s in d['specifications'] if s[0]!='RAM / Speicher']+[['RAM / Speicher',ram+' GB / '+storage+' GB']]
  v['details']=d
 # Shared description must not claim a single colour or card bundle.
 p['details']=copy.deepcopy(p['variants'][0]['details'])
 pairs=[(v['hardware'],v.get('color','')) for v in p['variants']];assert len(set(pairs))==len(pairs),(p['id'],pairs)
def download(v):
 path=root/v['image'].lstrip('/')
 if path.exists():return
 with urlopen(Request(v['imageSource'],headers={'User-Agent':'Mozilla/5.0'}),timeout=40) as r:data=r.read()
 assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',v['sku'];path.write_bytes(data)
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,[v for p in cat['products'] for v in p['variants']]))
cat['updatedAt']='2026-10-01'
(root/'data/catalogue.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n')
(root/'research/supplier-pricing.json').write_text(json.dumps(list(pricing.values()),ensure_ascii=False,indent=2)+'\n')
exclusions=lines(evidence/'variant-exclusions.ndjson'); families=lines(evidence/'variant-families.ndjson')
report=[]
for p in cat['products']:
 a=next(x for x in audit if x['id']==p['id'])
 report.append({'productId':p['id'],'name':p['name'],'source':p['source'],'checkedAt':a['checkedAt'],'hardwareOptions':list(dict.fromkeys(v['hardware'] for v in p['variants'])),'variants':[{'sku':v['sku'],'hardware':v['hardware'],'color':v.get('color',''),'source':v['source']} for v in p['variants']],'unavailable':[x for x in exclusions if x['productId']==p['id']]})
(root/'research/variant-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Models:',len(cat['products']),'Variants:',sum(len(p['variants']) for p in cat['products']))
