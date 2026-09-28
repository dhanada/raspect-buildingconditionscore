"""Fetch full medias + annotation data for the Adani inspection; dump to JSON files."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

PROJ = '6ab110d3cdfb989e4a9aa35b'
WS = '6ab110d3cdfb989e4a9aa358'
INSP = '6ab110d3cdfb989e4a9aa35c'

s, medias = call('GET', '/inspection/api/v1/projects/%s/inspection/%s/medias' % (PROJ, INSP))
print('medias:', s, 'count:', len(medias) if isinstance(medias, list) else type(medias))
if isinstance(medias, list):
    with open('adani-medias.json', 'w', encoding='utf-8') as f:
        json.dump(medias, f, ensure_ascii=False)
    # structure of items
    keys = {}
    for m in medias:
        for k in m:
            keys[k] = keys.get(k, 0) + 1
    print('item keys:', keys)
    print('\nfirst item full:')
    print(json.dumps(medias[0], ensure_ascii=False, indent=1)[:1500])
    print('\nsecond item full:')
    print(json.dumps(medias[1], ensure_ascii=False, indent=1)[:1500])
    # statuses
    from collections import Counter
    print('\nstatus:', dict(Counter(m.get('status') for m in medias)))
    print('contentType:', dict(Counter(m.get('contentType') for m in medias)))

# defect scheme
s2, scheme = call('GET', '/inspection/api/v1/defectSchemes/%s' % '688caf1f4a64ebe1287a8942')
print('\ndefectScheme:', s2)
if s2 == 200:
    print(json.dumps(scheme, ensure_ascii=False, indent=1)[:2500])
