"""Probe with segment-2-as-project id combinations."""
import json
import sys
sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call

CORP = '62456f547870e6d103f746eb'
SEG2 = '6ab110d3cdfb989e4a9aa35b'
SEG3 = '6ab110d3cdfb989e4a9aa358'

probes = [
    # segment2 as project, segment3 as inspection
    ('proj=SEG2 medias', '/inspection/api/v1/projects/%s/inspection/%s/medias?page=1&limit=1' % (SEG2, SEG3)),
    ('proj=SEG2 defectTypes', '/inspection/api/v1/projects/%s/inspection/%s/defectTypes' % (SEG2, SEG3)),
    ('proj=SEG2 annotations', '/inspection/api/v1/projects/%s/inspection/%s/annotations?page=1&limit=1' % (SEG2, SEG3)),
    # WKC-style: project=SEG2, workspace=SEG3
    ('proj=SEG2 ws=SEG3 inspections', '/inspection/api/v1/projects/%s/workspaces/%s/inspections' % (SEG2, SEG3)),
    ('proj=SEG2 ws=SEG3', '/inspection/api/v1/projects/%s/workspaces/%s' % (SEG2, SEG3)),
    # project list under corporate via inspection service
    ('inspection api corp projects', '/inspection/api/v1/corporates/%s/projects' % CORP),
    ('inspection api corp projects2', '/inspection/api/v1/projects?corporateId=%s' % CORP),
    # asset service guesses
    ('asset workspaces', '/asset/api/v1/workspaces?corporateId=%s' % CORP),
    ('asset assets', '/asset/api/v1/assets?corporateId=%s&page=1&limit=3' % CORP),
    ('asset corporates/projects', '/asset/api/v1/corporates/%s/projects' % CORP),
]

for name, path in probes:
    s, d = call('GET', path)
    if s != 200:
        print('%s: HTTP %s %s' % (name, s, str(d)[:160]))
        continue
    if isinstance(d, list):
        print('%s: list len=%d' % (name, len(d)))
        for it in d[:3]:
            print('   ' + json.dumps(it, ensure_ascii=False)[:250])
    else:
        print('%s: keys=%s' % (name, sorted(d.keys()) if isinstance(d, dict) else type(d)))
        print('   ' + json.dumps(d, ensure_ascii=False)[:600])
