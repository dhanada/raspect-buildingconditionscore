"""Fetch Adani project + inspection details and probe defect endpoints."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

CORP = '62456f547870e6d103f746eb'
PROJ = '6ab110d3cdfb989e4a9aa35b'
WS = '6ab110d3cdfb989e4a9aa358'
INSP = '6ab110d3cdfb989e4a9aa35c'

# 1. find the project in the corporate list
s, projs = call('GET', '/asset/api/v1/corporates/%s/projects' % CORP)
if s == 200:
    for p in projs:
        if p.get('_id') == PROJ:
            print('PROJECT FOUND:')
            print(json.dumps(p, ensure_ascii=False, indent=1)[:2500])
            break
    else:
        print('project %s not in list; scanning codes for Adani/DKM...' % PROJ[:8])
        for p in projs:
            if 'adan' in json.dumps(p).lower() or 'DKM' in p.get('code', ''):
                print('  match:', p.get('code'), p.get('clientName'), p.get('_id'))
else:
    print('projects list failed:', s)

# 2. full inspections object for the workspace
s, insp = call('GET', '/inspection/api/v1/projects/%s/workspaces/%s/inspections' % (PROJ, WS))
print('\ninspections endpoint:', s)
if s == 200:
    items = insp.get('inspections', [])
    for it in items:
        print('  inspection:', it.get('_id'), '|', it.get('name'), '| defectUpdated:', it.get('defectUpdated'))
        print('  keys:', sorted(it.keys()))
        d = {k: v for k, v in it.items() if k not in ('defectsToBePosition',)}
        print(json.dumps(d, ensure_ascii=False, indent=1)[:2000])
        print('  defectsToBePosition count:', len(it.get('defectsToBePosition') or []))

# 3. defect endpoints with correct inspection id
paths = {
    'defectTypes': '/inspection/api/v1/projects/%s/inspection/%s/defectTypes' % (PROJ, INSP),
    'annotations?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/annotations?page=1&limit=1' % (PROJ, INSP),
    'medias?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/medias?page=1&limit=1' % (PROJ, INSP),
    'defects?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/defects?page=1&limit=1' % (PROJ, INSP),
    'images-n-annotations?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/images-n-annotations?page=1&limit=1' % (PROJ, INSP),
    'workspaces/ws/inspections/insp/defects': '/inspection/api/v1/projects/%s/workspaces/%s/inspections/%s/defects' % (PROJ, WS, INSP),
    'workspaces/ws/inspection/insp/defects': '/inspection/api/v1/projects/%s/workspaces/%s/inspection/%s/defects' % (PROJ, WS, INSP),
    'projects/inspection/insp (object)': '/inspection/api/v1/projects/%s/inspection/%s' % (PROJ, INSP),
}
for name, path in paths.items():
    s2, d2 = call('GET', path)
    if s2 != 200:
        print('-- %s: HTTP %s %s' % (name, s2, str(d2)[:150]))
    elif isinstance(d2, list):
        print('-- %s: list len=%d' % (name, len(d2)))
        if d2:
            print('   first: ' + json.dumps(d2[0], ensure_ascii=False)[:500])
    else:
        print('-- %s: keys=%s' % (name, sorted(d2.keys()) if isinstance(d2, dict) else type(d2)))
        print('   ' + json.dumps(d2, ensure_ascii=False)[:600])
