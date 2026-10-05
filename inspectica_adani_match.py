"""Match report DF ids to platform defectNum and compare attributes."""
import json
import re
from collections import Counter

# report appendix rows (parsed earlier pattern)
p1 = open(r'C:\Users\DHANA_~1\AppData\Local\Temp\chimney-ana\part1.txt', encoding='utf-8').read().splitlines()
appA = p1[169:1163]

rows = {}
cur = None
for ln in appA:
    s = ln.strip()
    m = re.match(r'^(Spalling|Delamination|Crack|Corrosion) \((\d+)\)$', s)
    if m:
        cur = m.group(1)
        continue
    m = re.match(r'^\d+ \|\| (DF\d+) \|\| (Chimney -1_Side-\d), (V\d+-\d+) \|\| (\w+) \|\| (\d+)L \* (\d+)W = (\d+) \|\| (\w+) \|\|', s)
    if m:
        rows[m.group(1)] = dict(type=cur, floor=m.group(4), L=int(m.group(5)), W=int(m.group(6)),
                                sev=m.group(8), side=m.group(2))

print('report appendix rows:', len(rows))

# platform annotations
d = json.load(open('adani-images-annotations.json', encoding='utf-8'))
anns = d['annotations']
by_num = {}
for a in anns:
    n = a.get('defectNum')
    by_num.setdefault(n, []).append(a)
print('platform annotations:', len(anns), 'unique defectNums:', len(by_num))
print('platform defectNum range:', min(by_num), '-', max(by_num))

report_nums = [int(r[2:]) for r in rows]
missing = [n for n in report_nums if n not in by_num]
print('report ids missing from platform:', len(missing), missing[:15])
extra = [n for n in by_num if n not in set(report_nums)]
print('platform defectNums not in report:', len(extra))

# compare attributes for matched
changed = Counter()
mismatch_detail = []
for dfid, rr in rows.items():
    n = int(dfid[2:])
    if n not in by_num:
        continue
    plats = by_num[n]
    # find best-matching platform record (same inspectType visual + component tower etc.)
    plat = next((a for a in plats if a.get('defectType') == rr['type'].lower()), plats[0])
    sev_map = {'Critical': 'critical', 'Major': 'major', 'Moderate': 'moderate'}
    diffs = []
    if plat.get('level') != sev_map.get(rr['sev']):
        diffs.append('level: report=%s platform=%s' % (rr['sev'], plat.get('level')))
    if plat.get('floor') != rr['floor']:
        diffs.append('floor: report=%s platform=%s' % (rr['floor'], plat.get('floor')))
    L, W = plat.get('defectLength'), plat.get('defectWidth')
    if L is not None and abs(L - rr['L']) > 2:
        diffs.append('L: report=%d platform=%.1f' % (rr['L'], L))
    if W is not None and abs(W - rr['W']) > 2:
        diffs.append('W: report=%d platform=%.1f' % (rr['W'], W))
    if diffs:
        key = '+'.join(sorted(set(d.split(':')[0] for d in diffs)))
        changed[key] += 1
        if len(mismatch_detail) < 12:
            mismatch_detail.append('%s (%s): %s' % (dfid, rr['type'], '; '.join(diffs)))

print('\nattribute changes (report 26 Sep vs platform now):')
for k, v in changed.most_common():
    print('  ', k, ':', v)
print('\nsample mismatches:')
for x in mismatch_detail:
    print('  ', x)

# platform stats restricted to the report's 966 ids
print('\nplatform records for report ids, by level:')
sel = []
for n in report_nums:
    if n in by_num:
        for a in by_num[n]:
            if a.get('defectType') in ('spalling', 'crack', 'delamination', 'corrosion'):
                sel.append(a)
print('  total:', len(sel), dict(Counter(a.get('level') for a in sel)))
print('  by type:', dict(Counter(a.get('defectType') for a in sel)))
print('  by floor:', dict(Counter(a.get('floor') for a in sel)))
