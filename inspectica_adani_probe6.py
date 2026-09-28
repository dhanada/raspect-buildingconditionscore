"""Try param variants for images-n-annotations and defectTypes."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

PROJ = '6ab110d3cdfb989e4a9aa35b'
INSP = '6ab110d3cdfb989e4a9aa35c'

base = '/inspection/api/v1/projects/%s/inspection/%s/images-n-annotations' % (PROJ, INSP)
variants = [
    ('none', ''),
    ('page=1&limit=10', '?page=1&limit=10'),
    ('page=0&limit=10', '?page=0&limit=10'),
    ('page=1&pageSize=10', '?page=1&pageSize=10'),
    ('page=1&size=10', '?page=1&size=10'),
    ('offset=0&limit=10', '?offset=0&limit=10'),
    ('limit=10', '?limit=10'),
    ('page=1&limit=10&keyword=', '?page=1&limit=10&keyword='),
]
for name, qs in variants:
    s, d = call('GET', base + qs)
    if s != 200:
        print('%s: HTTP %s %s' % (name, s, str(d)[:120]))
        continue
    imgs = d.get('images') or []
    anns = d.get('annotations') or []
    print('%s: images=%d annotations=%d keys=%s' % (name, len(imgs), len(anns), sorted(d.keys())))
    if imgs:
        print('  img[0]: ' + json.dumps(imgs[0], ensure_ascii=False)[:300])
    if anns:
        print('  ann[0]: ' + json.dumps(anns[0], ensure_ascii=False)[:400])
        break

# defectTypes with language
for lang in ('en', 'zh', 'en-US', 'en_US'):
    s2, d2 = call('GET', '/inspection/api/v1/projects/%s/inspection/%s/defectTypes?language=%s' % (PROJ, INSP, lang))
    print('defectTypes lang=%s: HTTP %s %s' % (lang, s2, json.dumps(d2, ensure_ascii=False)[:200] if s2 == 200 else str(d2)[:120]))
    if s2 == 200:
        break

# topology (elevation plans)
s3, d3 = call('GET', '/inspection/api/v1/projects/%s/workspaces/%s/inspection/%s/topology' % (PROJ, '6ab110d3cdfb989e4a9aa358', INSP))
print('topology:', s3)
if s3 == 200:
    print(json.dumps(d3, ensure_ascii=False)[:600])
