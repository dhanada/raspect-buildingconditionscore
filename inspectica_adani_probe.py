"""Probe Inspectica API for the Adani chimney inspection (from SPA URL)."""
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
CREDS = os.path.join(BASE, 'inspectica-creds.txt')
TOKENS = os.path.join(BASE, 'inspectica-tokens.json')
HOST = 'https://inspectica.raspect.ai'

PID = '62456f547870e6d103f746eb'   # from URL segment 1 (corporate/project?)
WID = '6ab110d3cdfb989e4a9aa35b'   # from URL segment 2 (workspace/asset?)
IID = '6ab110d3cdfb989e4a9aa358'   # from URL segment 3 (inspection?)


def read_creds():
    lines = open(CREDS, 'r', encoding='utf-8-sig').read().splitlines()
    return lines[0].strip(), lines[1].strip()


def load_tokens():
    return json.load(open(TOKENS, 'r', encoding='utf-8'))


def save_tokens(tok):
    with open(TOKENS, 'w', encoding='utf-8') as f:
        json.dump(tok, f)


def re_login():
    login, pw = read_creds()
    body = json.dumps({'login': login, 'password': pw}).encode('utf-8')
    req = urllib.request.Request(HOST + '/user/api/v1/auth/login', data=body,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=30) as r:
        tok = json.loads(r.read().decode('utf-8'))
    save_tokens(tok)
    return tok


def refresh(tok):
    body = json.dumps({'userId': tok['userId'], 'refreshToken': tok['refreshToken']}).encode('utf-8')
    req = urllib.request.Request(HOST + '/user/api/v1/auth/refresh', data=body,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=30) as r:
            data = json.loads(r.read().decode('utf-8'))
        if data.get('accessToken'):
            tok['accessToken'] = data['accessToken']
            if data.get('refreshToken'):
                tok['refreshToken'] = data['refreshToken']
            save_tokens(tok)
            return True
        return False
    except urllib.error.HTTPError:
        return False


def call(method, path, body=None, tries=0):
    tok = load_tokens()
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(HOST + path, data=data, method=method,
                                 headers={'Authorization': 'Bearer ' + tok['accessToken'],
                                          'Content-Type': 'application/json',
                                          'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=60) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403) and tries < 1:
            if refresh(tok):
                return call(method, path, body, tries=tries + 1)
            re_login()
            return call(method, path, body, tries=tries + 1)
        return e.code, e.read().decode('utf-8', 'ignore')[:200]


def main():
    # 1. Inspections list under (PID, WID)
    s, insp = call('GET', '/inspection/api/v1/projects/%s/workspaces/%s/inspections' % (PID, WID))
    print('inspections list: HTTP', s)
    if s == 200:
        if isinstance(insp, dict) and 'inspections' in insp:
            items = insp['inspections']
        elif isinstance(insp, list):
            items = insp
        else:
            items = []
        print('  count =', len(items))
        for it in items:
            print('  -', it.get('_id'), '|', it.get('name'), '|', it.get('createdAt'))
        target = next((it for it in items if it.get('_id') == IID), None)
        if target is not None:
            print('\n  TARGET inspection object keys:', sorted(target.keys()))
            print('  ' + json.dumps(target, ensure_ascii=False)[:800])

    # 2. Probe endpoints for the inspection id
    for pid, wid, label in ((PID, WID, 'PID/WID from URL'), (PID, IID, 'PID/IID')):
        print('\n===== label=%s =====' % label)
        paths = {
            'annotations': '/inspection/api/v1/projects/%s/inspection/%s/annotations' % (pid, wid),
            'annotations?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/annotations?page=1&limit=1' % (pid, wid),
            'medias?limit=1': '/inspection/api/v1/projects/%s/inspection/%s/medias?page=1&limit=1' % (pid, wid),
            'defectTypes': '/inspection/api/v1/projects/%s/inspection/%s/defectTypes' % (pid, wid),
        }
        for name, path in paths.items():
            s2, d2 = call('GET', path)
            if s2 != 200:
                print('-- %s: HTTP %s %s' % (name, s2, str(d2)[:120]))
            elif isinstance(d2, list):
                print('-- %s: list len=%d' % (name, len(d2)))
                if d2:
                    print('   first: ' + json.dumps(d2[0], ensure_ascii=False)[:400])
            else:
                txt = json.dumps(d2, ensure_ascii=False)
                print('-- %s: keys=%s' % (name, list(d2.keys()) if isinstance(d2, dict) else type(d2)))
                print('   ' + txt[:400])
    return 0


if __name__ == '__main__':
    sys.exit(main())
