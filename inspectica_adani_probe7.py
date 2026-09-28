"""Try images-n-annotations with layoutId/planId params; inspect one annotation object."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

PROJ = '6ab110d3cdfb989e4a9aa35b'
INSP = '6ab110d3cdfb989e4a9aa35c'

# layoutIds/planIds from medias assignments
medias = json.load(open('adani-medias.json', encoding='utf-8'))
layouts = sorted(set(m['assignments']['layoutId'] for m in medias if m.get('assignments')))
plans = sorted(set(m['assignments']['planId'] for m in medias if m.get('assignments')))
print('layoutIds:', layouts)
print('planIds:', plans)

base = '/inspection/api/v1/projects/%s/inspection/%s/images-n-annotations' % (PROJ, INSP)
for lid in layouts:
    for qs in ('?layoutId=%s' % lid, '?layoutId=%s&page=1&limit=5' % lid):
        s, d = call('GET', base + qs)
        if s != 200:
            print('%s: HTTP %s %s' % (qs, s, str(d)[:100]))
            continue
        imgs, anns = d.get('images') or [], d.get('annotations') or []
        print('%s: images=%d annotations=%d' % (qs, len(imgs), len(anns)))
        if anns:
            print('  ann[0]: ' + json.dumps(anns[0], ensure_ascii=False)[:800])
            break
    else:
        continue
    break

# one annotation object by id (from defectsToBePosition)
s, insp = call('GET', '/inspection/api/v1/projects/%s/workspaces/%s/inspections' % (PROJ, '6ab110d3cdfb989e4a9aa358'))
if s == 200:
    items = insp.get('inspections', [])
    for it in items:
        if it.get('_id') == INSP:
            did = (it.get('defectsToBePosition') or [None])[0]
            print('\ndefectsToBePosition count:', len(it.get('defectsToBePosition') or []))
            if did:
                s2, a = call('GET', '/inspection/api/v1/projects/%s/inspection/%s/annotation/%s' % (PROJ, INSP, did))
                print('annotation %s: HTTP %s' % (did, s2))
                if s2 == 200:
                    print(json.dumps(a, ensure_ascii=False, indent=1)[:2000])
