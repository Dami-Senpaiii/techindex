"""Build catalogue from saved, visible TVCMALL observations and German editorial details.

Usage: python3 scripts/import-catalogue.py observations.json details.json
Prices use the visible CHF unit price plus exactly CHF 20. Shipping quotes retain
all observed methods, transit units, destination, date and quoted quantity.
Raw supplier descriptions are not published. Checkout remains disabled.
"""
from pathlib import Path
from decimal import Decimal
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
observations = json.loads(Path(sys.argv[1]).read_text())
details = json.loads(Path(sys.argv[2]).read_text())
existing = json.loads((root / 'data/catalogue.json').read_text())
existing_images = {p['id']: (p.get('image'), p.get('imageSource')) for p in existing['products']}
existing_variant_images = {v['sku']: v.get('image') or (p.get('image') if v['sku'] == p['variants'][0]['sku'] else None) for p in existing['products'] for v in p['variants']}
minor = lambda amount: int(Decimal(amount) * 100)
products, groups, audit = [], {}, []
for item in sorted(observations, key=lambda item: item['id']):
    match = re.search(r'CHF\s+([\d,]+\.\d{2})', item['offer'])
    if not match or item['sku'] not in item['offer']:
        raise ValueError('Missing CHF unit price or incorrect SKU: ' + item['id'])
    cost = minor(match[1].replace(',', ''))
    options = []
    for method, price, duration in item['shipping']:
        days = re.fullmatch(r'(\d+)\s*-\s*(\d+)\s+(calendar days|business days?)', duration.strip())
        if not days or not price.startswith('CHF '):
            raise ValueError('Unrecognised shipping quote: ' + repr([method, price, duration]))
        options.append({'method': method.strip(), 'costMinor': minor(price.removeprefix('CHF ').replace(',', '')), 'days': [int(days[1]), int(days[2])], 'dayType': 'business' if days[3].startswith('business') else 'calendar'})
    if not options or 'Switzerland' not in item['quote']:
        raise ValueError('Missing Swiss quote: ' + item['id'])
    processing = re.search(r'Estimated Processing Time:\s*(\d+)\s*-\s*(\d+) days', item['offer'])
    shipping = {'country': 'CH', 'currency': 'CHF', 'quantity': int(item.get('quantity', 1)), 'checkedAt': '2026-09-30', 'complete': True, 'processingDays': [int(processing[1]), int(processing[2])] if processing else None, 'options': options}
    name = item['name'].split(' · ')[0] if item['category'] == 'handhelds' else item['name']
    key = item['category'] + ':' + name
    if key not in groups:
        image, image_source = existing_images.get(item['id'], (None, None))
        if not image_source:
            image_source = next((url for url in item['images'] if '/800x800_' in url and '-1.webp' in url), None)
        if not image_source:
            raise ValueError('No observed product image: ' + item['id'])
        product = {'id': item['id'], 'name': name, 'category': item['category'], 'status': 'available', 'image': image, 'imageSource': image_source, 'source': item['source'], 'researchSource': item['researchSource'], 'details': details[item['id']], 'variants': []}
        groups[key] = product
        products.append(product)
    image_source = next((url for url in item['images'] if item['sku'].lower() in url.lower() and '/800x800_' in url and '-1.webp' in url), None)
    if not image_source:
        saved_source = existing_images.get(item['id'], (None, None))[1]
        if saved_source and item['sku'].lower() in saved_source.lower(): image_source = saved_source
    if not image_source:
        raise ValueError('No matching variant image: ' + item['sku'])
    variant = {'name': item['name'], 'sku': item['sku'], 'source': item['source'], 'priceMinor': cost + 2000, 'shipping': shipping, 'image': existing_variant_images.get(item['sku']), 'imageSource': image_source}
    for field in ['memory', 'ramGB', 'storage', 'hardware', 'color']:
        if field in item: variant[field] = item[field]
    if item['category'] == 'handhelds':
        axes = item['name'].removeprefix(name + ' · ').split(' · ')
        if len(axes) != 2:
            raise ValueError('Missing separate hardware and colour: ' + item['sku'])
        variant['hardware'], variant['color'] = axes
    groups[key]['variants'].append(variant)
    if item.get('featured'):
        groups[key]['featured'] = True
        groups[key]['defaultSku'] = item['defaultSku']
    audit.append({'sku': item['sku'], 'source': item['source'], 'checkedAt': '2026-09-30', 'currency': 'CHF', 'purchasePriceMinor': cost, 'markupMinor': 2000, 'priceMinor': cost + 2000, 'quoteQuantity': shipping['quantity'], 'shippingOptions': options})
priority = {'h001': 0, 'h019': 1, 'h005': 2, 'h022': 3}
products.sort(key=lambda p: (0 if p['category'] == 'handhelds' else 1, priority.get(p['id'], 10)))

def download_image(variant):
    if variant['image'] and (root / variant['image'].lstrip('/')).exists(): return
    url = variant['imageSource']
    if not url.startswith('https://img.tvcmall.com/'):
        raise ValueError('Unexpected image host')
    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
        data = response.read()
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('Invalid product WebP: ' + variant['sku'])
    path = root / 'assets/shop' / (variant['sku'].lower() + '.webp')
    path.write_bytes(data)
    variant['image'] = '/assets/shop/' + path.name
with ThreadPoolExecutor(max_workers=3) as pool:
    variants = [v for p in products for v in p['variants']]
    list(pool.map(download_image, variants))
for product in products:
    display_variant = next((v for v in product['variants'] if v['sku'] == product.get('defaultSku')), product['variants'][0])
    product['image'], product['imageSource'] = display_variant['image'], display_variant['imageSource']
(root / 'data/catalogue.json').write_text(json.dumps({'mode': 'preview', 'updatedAt': '2026-09-30', 'currency': 'CHF', 'products': products}, ensure_ascii=False, indent=2) + '\n')
(root / 'research').mkdir(exist_ok=True)
(root / 'research/supplier-pricing.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'models':len(products), 'variants':len(audit), 'categories':{c:sum(p['category']==c for p in products) for c in sorted({p['category'] for p in products})}}, ensure_ascii=False))
