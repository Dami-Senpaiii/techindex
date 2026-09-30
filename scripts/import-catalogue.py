"""Build the local, non-orderable catalogue from the supplied research Markdown.

Usage: python3 scripts/import-catalogue.py /absolute/path/to/research
Never imports supplier costs as retail prices or promotes candidates to live.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
research = Path(sys.argv[1])
products = []
groups = {}
selected = {
    '01_KABEL.md': ('kabel', {'001', '032', '034'}),
    '02_BEAMER.md': ('beamer', {'051', '067', '069'}),
    '03_GAMING.md': ('controller', {'074', '086', '103'}),
    '04_PERIPHERIE.md': ('peripherie', {'121', '141', '156'}),
    '07_HANDHELDS.md': ('handhelds', None),
}
for filename, (category, ids) in selected.items():
    for line in (research / filename).read_text().splitlines():
        cells = [cell.strip() for cell in line.strip('|').split('|')]
        if len(cells) < 3 or not re.fullmatch(r'(?:H\d{3}|\d{3})', cells[0]):
            continue
        if ids is not None and cells[0] not in ids:
            continue
        link = re.fullmatch(r'\[([^]]+)\]\((https://www\.tvcmall\.com/[^)]+)\)', cells[2])
        if not link:
            raise ValueError('Missing source for ' + cells[0])
        sku, url = link.groups()
        title = cells[1].split(' · ')[0] if category == 'handhelds' else cells[1]
        key = category + ':' + title
        if key not in groups:
            product = {'id': cells[0].lower(), 'name': title, 'category': category,
                       'status': 'in_preparation', 'image': None, 'imageSource': None,
                       'source': url, 'researchSource': filename, 'variants': []}
            groups[key] = product
            products.append(product)
        groups[key]['variants'].append({'name': cells[1], 'sku': sku, 'source': url})

priority = {'h001': 0, 'h019': 1, 'h005': 2, 'h022': 3}
products.sort(key=lambda p: (0 if p['category'] == 'handhelds' else 1, priority.get(p['id'], 10)))

def download_image(product):
    try:
        sku = product['variants'][0]['sku']
        # The observed product page uses this SKU-addressed CDN format.
        # Each response is checked before inclusion; no synthetic product art.
        image_url = 'https://img.tvcmall.com/dynamic/uploads/details/800x800_' + sku.upper() + '-1.webp'
        with urlopen(Request(image_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=25) as response:
            data = response.read()
        if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
            raise ValueError('Not a WebP image')
        path = root / 'assets' / 'shop' / (sku.lower() + '.webp')
        path.write_bytes(data)
        product['image'] = '/assets/shop/' + path.name
        product['imageSource'] = image_url
        return product['name'] + ': image saved'
    except Exception as error:
        return product['name'] + ': no image: ' + str(error)

with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(download_image, products))
catalogue = {'mode': 'preview', 'updatedAt': '2026-09-30', 'products': products}
(root / 'data' / 'catalogue.json').write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'models': len(products), 'handheldVariants': sum(len(p['variants']) for p in products if p['category'] == 'handhelds'), 'images': sum(bool(p['image']) for p in products), 'failures': [r for r in results if 'no image' in r]}, ensure_ascii=False))
