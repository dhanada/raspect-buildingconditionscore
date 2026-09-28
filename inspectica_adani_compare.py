"""Fetch all comparable platform data for the Adani inspection and save to JSON."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

PROJ = '6ab110d3cdfb989e4a9aa35b'
WS = '6ab110d3cdfb989e4a9aa358'
INSP = '6ab110d3cdfb989e4a9aa35c'

out = {}

# 1. defect types (full taxonomy)
s, d = call('GET', '/inspection/api/v1/projects/%s/inspection/%s/defectTypes?language=en' % (PROJ, INSP))
print('defectTypes:', s)
if s == 200:
    out['defectTypes'] = d
    defs = d.get('defectDefinitions') or []
    print('  top-level definitions:', len(defs))
    for t in defs:
        print('  -', t.get('name'), '| children:', len(t.get('children') or []))
        for c in (t.get('children') or [])[:8]:
            print('      *', c.get('name'), '| children:', len(c.get('children') or []))

# 2. layoutIds / planIds
for name, path in (('layoutIds', '/inspection/api/v1/projects/%s/inspection/%s/layoutIds' % (PROJ, INSP)),
                   ('planIds', '/inspection/api/v1/projects/%s/inspection/%s/planIds' % (PROJ, INSP)),
                   ('layoutPlanMarkers/get', '/inspection/api/v1/projects/%s/inspection/%s/layoutPlanMarkers/get' % (PROJ, INSP)),
                   ('tags', '/inspection/api/v1/projects/%s/inspection/%s/tags' % (PROJ, INSP))):
    s2, d2 = call('GET', path)
    print(name, ':', s2, (json.dumps(d2, ensure_ascii=False)[:400] if s2 == 200 else str(d2)[:100]))
    if s2 == 200:
        out[name] = d2

json.dump(out, open('adani-platform-data.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('\nsaved adani-platform-data.json with keys:', list(out.keys()))
