"""Discover the id hierarchy for the Adani inspection URL on Inspectica."""
import json
import sys
import urllib.request

sys.path.insert(0, r'C:\Users\dhana_mi388iv\Documents\RaSpect')
from inspectica_adani_probe import call, HOST  # reuse auth helpers

PID = '62456f547870e6d103f746eb'   # segment 1
WID = '6ab110d3cdfb989e4a9aa35b'   # segment 2
IID = '6ab110d3cdfb989e4a9aa358'   # segment 3

probes = [
    ('me', '/user/api/v1/me'),
    ('users/me', '/user/api/v1/users/me'),
    ('projects (asset)', '/asset/api/v1/projects'),
    ('projects?limit=5 (asset)', '/asset/api/v1/projects?page=1&limit=5'),
    ('projects (inspection)', '/inspection/api/v1/projects'),
    ('corp workspaces', '/inspection/api/v1/projects/%s/workspaces' % PID),
    ('corp inspections', '/inspection/api/v1/projects/%s/inspections' % PID),
    ('workspace %s' % WID, '/inspection/api/v1/projects/%s/workspaces/%s' % (PID, WID)),
    ('workspace alone', '/inspection/api/v1/workspaces/%s' % WID),
    ('inspection alone', '/inspection/api/v1/inspections/%s' % IID),
]

for name, path in probes:
    s, d = call('GET', path)
    if s != 200:
        print('%s: HTTP %s %s' % (name, s, str(d)[:150]))
        continue
    if isinstance(d, list):
        print('%s: list len=%d' % (name, len(d)))
        for it in d[:5]:
            print('   ' + json.dumps(it, ensure_ascii=False)[:220])
    else:
        print('%s: keys=%s' % (name, sorted(d.keys()) if isinstance(d, dict) else type(d)))
        txt = json.dumps(d, ensure_ascii=False)
        print('   ' + txt[:700])
