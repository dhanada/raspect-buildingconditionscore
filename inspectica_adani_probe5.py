"""Probe defect/annotation endpoints; inspect assignments structure."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

PROJ = '6ab110d3cdfb989e4a9aa35b'
WS = '6ab110d3cdfb989e4a9aa358'
INSP = '6ab110d3cdfb989e4a9aa35c'

paths = {
    'ws annotations': '/inspection/api/v1/projects/%s/workspaces/%s/inspections/%s/annotations' % (PROJ, WS, INSP),
    'ws medias?limit=1': '/inspection/api/v1/projects/%s/workspaces/%s/inspections/%s/medias?page=1&limit=1' % (PROJ, WS, INSP),
    'defects q': '/inspection/api/v1/defects?inspectionId=%s&limit=1' % INSP,
    'defects q2': '/inspection/api/v1/defects?projectId=%s&limit=1' % PROJ,
    'inspection defects q': '/inspection/api/v1/inspections/%s/defects?limit=1' % INSP,
    'images-n-annotations no params': '/inspection/api/v1/projects/%s/inspection/%s/images-n-annotations' % (PROJ, INSP),
    'images-n-annotations ws': '/inspection/api/v1/projects/%s/workspaces/%s/inspections/%s/images-n-annotations' % (PROJ, WS, INSP),
    'defectScheme q': '/inspection/api/v1/defectSchemes?projectId=%s' % PROJ,
    'defectScheme by id': '/inspection/api/v1/defectScheme/%s' % '688caf1f4a64ebe1287a8942',
    'defectTypes ws full': '/inspection/api/v1/projects/%s/workspaces/%s/inspections/%s/defectTypes' % (PROJ, WS, INSP),
    'markers': '/inspection/api/v1/projects/%s/inspection/%s/markers' % (PROJ, INSP),
    'layouts': '/inspection/api/v1/projects/%s/inspection/%s/layouts' % (PROJ, INSP),
}
for name, path in paths.items():
    s, d = call('GET', path)
    if s != 200:
        print('-- %s: HTTP %s %s' % (name, s, str(d)[:130]))
    elif isinstance(d, list):
        print('-- %s: list len=%d' % (name, len(d)))
        if d:
            print('   first: ' + json.dumps(d[0], ensure_ascii=False)[:400])
    else:
        print('-- %s: keys=%s' % (name, sorted(d.keys()) if isinstance(d, dict) else type(d)))
        print('   ' + json.dumps(d, ensure_ascii=False)[:500])

# assignments deep-dive from saved medias
medias = json.load(open('adani-medias.json', encoding='utf-8'))
with_assign = [m for m in medias if m.get('assignments')]
print('\nmedias with assignments:', len(with_assign))
if with_assign:
    print('assignments keys:', sorted(with_assign[0]['assignments'].keys()))
    print('sample full assignment:')
    print(json.dumps(with_assign[0]['assignments'], ensure_ascii=False, indent=1)[:800])
    print('another:')
    print(json.dumps(with_assign[1]['assignments'], ensure_ascii=False, indent=1)[:800])
    # distribution of assignment shapes
    from collections import Counter
    shapes = Counter()
    for m in with_assign:
        shapes[json.dumps(sorted(m['assignments'].keys()))] += 1
    print('assignment key-shapes:', dict(shapes))
    # marker/layout id counts
    mk = Counter(m['assignments'].get('markerId') for m in with_assign)
    print('unique markerIds:', len(mk), 'unique layoutIds:', len(set(m['assignments'].get('layoutId') for m in with_assign)))
