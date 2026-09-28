"""Analyse platform defects vs report numbers."""
import json
from collections import Counter, defaultdict

d = json.load(open('adani-images-annotations.json', encoding='utf-8'))
anns = d['annotations']
imgs = d['images']
print('platform images (assigned):', len(imgs))
print('platform annotations (defects):', len(anns))

print('\n== by level (severity) ==')
print(dict(Counter(a.get('level') for a in anns)))
print('== by inspectType ==')
print(dict(Counter(a.get('inspectType') for a in anns)))
print('== by defectType ==')
print(dict(Counter(a.get('defectType') for a in anns)))
print('== by structType/component ==')
print(dict(Counter((a.get('structType'), a.get('component')) for a in anns)))
print('== by floor ==')
print(dict(Counter(a.get('floor') for a in anns)))
print('== by planId (side) ==')
plans = Counter(a.get('planLocation', {}).get('planId') for a in anns)
print(dict(plans))
print('== by followUpAction ==')
print(dict(Counter(a.get('followUpAction') for a in anns)))
print('== edited vs not ==')
print(dict(Counter(a.get('edited') for a in anns)))

# visual-only vs report's appendix (966: 735 Mod/172 Maj/59 Crit)
vis = [a for a in anns if a.get('inspectType') == 'visual']
print('\n== visual-only by level ==')
print(len(vis), dict(Counter(a.get('level') for a in vis)))
print('== visual-only by defectType ==')
print(dict(Counter(a.get('defectType') for a in vis)))
print('== visual-only by floor ==')
print(dict(Counter(a.get('floor') for a in vis)))

ir = [a for a in anns if a.get('inspectType') == 'ir']
print('\n== ir-only by level ==')
print(len(ir), dict(Counter(a.get('level') for a in ir)))
print('== ir-only by defectType ==')
print(dict(Counter(a.get('defectType') for a in ir)))
print('== ir-only by floor ==')
print(dict(Counter(a.get('floor') for a in ir)))

# level x type for visual
print('\n== visual level x defectType ==')
ts = defaultdict(Counter)
for a in vis: ts[a.get('defectType')][a.get('level')] += 1
for t, c in sorted(ts.items()): print('  ', t, dict(c))

# report's appendix had: spalling 143 (55 crit,24 maj,64 mod), delamination 80 (19 maj,61 mod),
# crack tower 716 (4 crit,128 maj,584 mod), corrosion 2 mod, crack ext finishes 25 (1 maj,24 mod)
print('\n== component split for visual crack ==')
cracks = [a for a in vis if a.get('defectType') == 'crack']
print(dict(Counter(a.get('component') for a in cracks)))
print(dict(Counter(a.get('level') for a in cracks)))
ext_cracks = [a for a in cracks if a.get('component') != 'tower']
print('ext-finish cracks:', len(ext_cracks), dict(Counter(a.get('level') for a in ext_cracks)))

# side mapping via planId
print('\n== side x level (visual) ==')
side = defaultdict(Counter)
for a in vis:
    p = a.get('planLocation', {}).get('planId')
    side[p][a.get('level')] += 1
for p, c in sorted(side.items()):
    print('  plan', p[:8], dict(c))
