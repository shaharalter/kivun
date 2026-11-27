#!/usr/bin/env python3
"""משלים יישוב-קרוב (proxy) ליישובים שאין להם נתוני תחבורה ואין להם קואורדינטות ב-transit/places.json,
לפי קובץ היישובים של הלמ"ס (bycode, עמודת "קואורדינטות" ברשת ישראל החדשה – ITM).
שימוש: python3 tools/fill_place_proxies.py bycode2022.xlsx [bycode2021.xlsx]"""
import json, math, sys, re, openpyxl
def itm_to_wgs(E, N):
    # Transverse Mercator הפוך, פרמטרי ITM (GRS80). דיוק של עשרות מטרים מספיק לבחירת יישוב קרוב.
    a = 6378137.0; f = 1 / 298.257222101; e2 = f * (2 - f); k0 = 1.0000067
    lat0 = math.radians(31 + 44 / 60 + 3.817 / 3600); lon0 = math.radians(35 + 12 / 60 + 16.261 / 3600)
    FE, FN = 219529.584, 626907.390
    def M(phi):
        return a * ((1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * phi - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * phi)
                    + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * phi) - (35 * e2**3 / 3072) * math.sin(6 * phi))
    m = M(lat0) + (N - FN) / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = mu + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu) + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu) + (151 * e1**3 / 96) * math.sin(6 * mu)
    ep2 = e2 / (1 - e2); C1 = ep2 * math.cos(phi1)**2; T1 = math.tan(phi1)**2
    N1 = a / math.sqrt(1 - e2 * math.sin(phi1)**2); R1 = a * (1 - e2) / (1 - e2 * math.sin(phi1)**2)**1.5
    D = (E - FE) / (N1 * k0)
    lat = phi1 - (N1 * math.tan(phi1) / R1) * (D**2 / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1**2 - 9 * ep2) * D**4 / 24)
    lon = lon0 + (D - (1 + 2 * T1 + C1) * D**3 / 6) / math.cos(phi1)
    return math.degrees(lat), math.degrees(lon)
def parse_coord(v):
    s = re.sub(r'\D', '', str(v or ''))
    if len(s) == 12: return int(s[:6]), int(s[6:])
    if len(s) == 10: return int(s[:5]) * 10, int(s[5:]) * 10
    return None
norm = lambda s: re.sub(r'[\s\-–׳\'"״()]', '', str(s or ''))
coords = {}
for f in sys.argv[1:]:
    ws = openpyxl.load_workbook(f, read_only=True).active
    rows = list(ws.iter_rows(values_only=True)); h = rows[0]
    iN, iC = h.index('שם יישוב'), h.index('קואורדינטות')
    for r in rows[1:]:
        c = parse_coord(r[iC])
        if c and norm(r[iN]) not in coords: coords[norm(r[iN])] = itm_to_wgs(*c)
cities = json.load(open('transit/cities.json')); P = json.load(open('transit/places.json'))
def dist(a, b):
    dy = (a[0] - b[0]) * 111.0; dx = (a[1] - b[1]) * 111.0 * math.cos(math.radians(a[0])); return math.hypot(dx, dy)
added = far = nocoord = 0
for m in P['missing']:
    if m[3] is not None: continue
    ll = coords.get(norm(m[0]))
    if not ll: nocoord += 1; continue
    j, d = min(((i, dist(ll, (c[1], c[2]))) for i, c in enumerate(cities)), key=lambda x: x[1])
    if d > 15: far += 1; continue
    while len(m) < 5: m.append(None)
    m[3] = j; m[4] = 'geo'; added += 1
P['_src'] = P.get('_src', '') + ' · יישוב קרוב לפי קואורדינטות הלמ"ס (bycode)'
json.dump(P, open('transit/places.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('added', added, 'far(>15km)', far, 'no coords', nocoord, 'still missing', sum(1 for m in P['missing'] if m[3] is None))
