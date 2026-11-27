/* כיוון – זמני נסיעה בתחבורה ציבורית מחושבים מלוח הזמנים הרשמי (GTFS של משרד התחבורה) */
(function () {
  'use strict';
  const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/transit\.js.*$/, '') : 'transit/';
  const K = { cities: null, campus: null, byCity: {} };
  const norm = s => String(s || '').replace(/קריית/g, 'קרית').replace(/[\s\-–'"״׳`.,()]/g, '').replace(/יי/g, 'י').replace(/וו/g, 'ו');
  async function loadCities() {
    if (!K.cities) K.cities = fetch(BASE + 'cities.json').then(r => r.json());
    return K.cities;
  }
  async function loadCampus() {
    if (!K.campus) K.campus = fetch(BASE + 'campus.json').then(r => r.json());
    return K.campus;
  }
  async function findCity(name) {
    const list = await loadCities(); const n = norm(name);
    if (!n) return null;
    let i = list.findIndex(c => norm(c[0]) === n);
    const pl = i < 0 ? await loadPlaces() : null;
    let m = pl ? pl.missing.find(x => norm(x[0]) === n) : null;
    if (i < 0 && !m) {
      i = list.findIndex(c => norm(c[0]).startsWith(n) && n.length >= 3);
      if (i < 0) i = list.findIndex(c => n.startsWith(norm(c[0])) && norm(c[0]).length >= 4 && n.length - norm(c[0]).length <= 2);
      if (i < 0 && pl && n.length >= 3) m = pl.missing.find(x => norm(x[0]).startsWith(n));
    }
    if (i >= 0) return { idx: i, name: list[i][0], lat: list[i][1], lon: list[i][2] };
    if (!m || m[3] == null) return null;
    const j = m[3];
    return { idx: j, name: list[j][0], lat: list[j][1], lon: list[j][2], asked: m[0], council: m[1], proxy: true };
  }
  async function loadPlaces() {
    if (!K.places) K.places = fetch(BASE + 'places.json').then(r => r.json()).catch(() => null);
    return K.places;
  }
  // מידע על יישוב שאין לו נתונים: לאיזו מועצה ונפה הוא שייך
  async function placeInfo(name) {
    const pl = await loadPlaces(); if (!pl) return null; const n = norm(name);
    const m = pl.missing.find(x => norm(x[0]) === n); if (!m) return null;
    return { name: m[0], council: m[1], nafa: m[2], hasProxy: m[3] != null };
  }
  async function allPlaceNames() {
    const [list, pl] = await Promise.all([loadCities(), loadPlaces()]);
    return [...new Set([...list.map(c => c[0]), ...((pl && pl.missing) || []).map(x => x[0])])].sort((a, b) => a.localeCompare(b, 'he'));
  }
  function proxyNote(c) {
    return c && c.proxy ? `<p class="tr-note tr-proxy">ⓘ אין לנו נתוני תחבורה ציבורית ל„${esc(c.asked)}”. היישוב שייך למועצה האזורית ${esc(c.council)}, ולכן מוצגים זמני הנסיעה מ„${esc(c.name)}” – היישוב הקרוב באותה מועצה שיש לו תחנות. הזמנים בפועל עשויים להיות שונים.</p>` : '';
  }
  async function forCity(name) {
    const c = await findCity(name); if (!c) return null;
    if (!K.byCity[c.idx]) K.byCity[c.idx] = fetch(BASE + 'o/' + c.idx + '.json').then(r => r.json());
    return { city: c, data: await K.byCity[c.idx] };
  }
  const hm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const ICON = { bus: '🚌', rail: '🚆', lrt: '🚈', metro: '🚇', cable: '🚡' };
  const MODEN = { bus: 'אוטובוס', rail: 'רכבת', lrt: 'רכבת קלה', metro: 'מטרו', cable: 'רכבל' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function lineName(m, num, ag) {
    if (m === 'rail') return 'רכבת ישראל';
    if (m === 'cable' && !num) return 'רכבל';
    return `${MODEN[m] || 'קו'} ${num}${ag ? ` (${ag})` : ''}`;
  }
  // אפשרות נסיעה: [הגעה, יציאה מהבית, הליכה בהתחלה, מקטעים, הליכה בסוף]
  function summary(opt) {
    if (!opt) return null;
    const [arr, leave, w0, legs] = opt;
    return { arr, leave, dur: arr - leave, transfers: Math.max(0, legs.length - 1), walkOnly: !legs.length };
  }
  function best(entry) {
    if (!entry || !entry.o || !entry.o.length) return null;
    return entry.o.map(summary).sort((a, b) => a.arr - b.arr || a.transfers - b.transfers)[0];
  }
  function shortText(entry) {
    const b = best(entry); if (!b) return null;
    if (b.walkOnly) return `ברגל מהמרכז של היישוב (כ-${b.dur} דק׳)`;
    return `כ-${b.dur} דק׳ בתחבורה ציבורית (${b.transfers ? (b.transfers === 1 ? 'החלפה אחת' : b.transfers + ' החלפות') : 'בלי החלפות'}; יציאה ${hm(b.leave)}, הגעה ${hm(b.arr)})`;
  }
  function optionHtml(opt, i, badge) {
    const [arr, leave, w0, legs, w1] = opt; const s = summary(opt);
    if (!legs.length) return `<div class="tr-opt"><div class="tr-head"><b>הליכה</b><span>כ-${s.dur} דק׳</span></div></div>`;
    const tag = s.transfers === 0 ? 'ישיר' : s.transfers === 1 ? 'החלפה אחת' : `${s.transfers} החלפות`;
    let h = `<div class="tr-opt"><div class="tr-head"><b>אפשרות ${i + 1} · ${tag}${badge ? ` · <span class="tr-badge">${badge}</span>` : ''}</b><span>יציאה ${hm(leave)} ← הגעה ${hm(arr)} · <b>${s.dur} דק׳</b></span></div><ol class="tr-legs">`;
    if (w0 > 0) h += `<li class="walk">🚶 הליכה ${w0} דק׳ לתחנה</li>`;
    legs.forEach((l, j) => {
      const [m, num, ag, hs, from, to, dep, ar] = l;
      if (j > 0) { const wait = dep - legs[j - 1][7]; h += `<li class="walk">🔁 החלפה${wait > 0 ? ` (המתנה/הליכה ${wait} דק׳)` : ''}</li>`; }
      h += `<li><span class="tr-ico">${ICON[m] || '🚌'}</span><button type="button" class="tr-showline" data-line="${esc(m + '|' + num + '|' + ag)}" title="הצגת הקו במפה"><b>${esc(lineName(m, num, ag))}</b> 🗺️</button>${hs ? ` <small>לכיוון ${esc(hs)}</small>` : ''}<br><small>עולים ב<b>${esc(from)}</b> ${hm(dep)} ← יורדים ב<b>${esc(to)}</b> ${hm(ar)} (${ar - dep} דק׳)</small></li>`;
    });
    if (w1 > 0) h += `<li class="walk">🚶 הליכה ${w1} דק׳ לקמפוס</li>`;
    return h + '</ol></div>';
  }
  function carEstimate(city, ll) {
    if (!city || !ll) return null;
    const R = 6371, rad = x => x * Math.PI / 180, dLa = rad(ll[0] - city.lat), dLo = rad(ll[1] - city.lon);
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(city.lat)) * Math.cos(rad(ll[0])) * Math.sin(dLo / 2) ** 2;
    const air = 2 * R * Math.asin(Math.sqrt(a)), road = air * 1.3;
    const v = road < 15 ? 30 : road < 50 ? 55 : 70;
    return { km: Math.round(road), min: Math.round(road / v * 60 + 5) };
  }
  // בלוק מלא למוסד אחד
  async function fullHtml(homeName, instId, instName) {
    const [r, cp] = await Promise.all([forCity(homeName).catch(() => null), loadCampus().catch(() => null)]);
    const C = cp && cp.campus[instId];
    let h = '<div class="tr-box">'; let routeKey = '', homeLL = '';
    if (!r) { const pi = homeName ? await placeInfo(homeName) : null; h += `<p class="tr-note">לא מצאנו את „${esc(homeName || '')}” בלוח הזמנים של התחבורה הציבורית.${pi ? ` היישוב שייך ${pi.council ? 'למועצה האזורית ' + esc(pi.council) : 'לנפת ' + esc(pi.nafa)}.` : ''} זמני הנסיעה: לא ידוע. יש לוודא ולבדוק – אפשר להשתמש בקישורים למטה.</p>`; }
    else {
      h += proxyNote(r.city); homeLL = r.city.lat + ',' + r.city.lon;
      const e = r.data[instId];
      h += `<h3>🚌 איך מגיעים מ${esc(r.city.name)}</h3><p class="tr-note">מחושב מלוח הזמנים הרשמי של משרד התחבורה (GTFS, עודכן ${cp ? cp.feed : ''}), ליום חול רגיל – יציאה מאמצע ${esc(r.city.name)} מ-7:00 בבוקר. זמנים בפועל משתנים לפי פקקים ושינויי קווים.</p>`;
      if (['huji', 'bgu', 'haifa', 'open'].includes(instId)) h += `<p class="tr-note">ⓘ הזמנים מחושבים לקמפוס הראשי של המוסד. אם החוג שלכם בקמפוס אחר, מומלץ לבדוק גם בגוגל מפות או במוביט.</p>`;
      if (!e || !e.o.length) h += `<p class="tr-note">לא נמצאה נסיעה בתחבורה ציבורית שמגיעה עד 11:00 בבוקר (עד 3 החלפות).</p>`;
      else {
        const os = [...e.o].sort((x, y) => x[0] - y[0]);
        const minT = Math.min(...os.map(o => o[3].length));
        const lg = os[0][3]; if (lg && lg.length) { const z = lg[lg.length - 1]; routeKey = z[0] + '|' + z[1] + '|' + z[2]; }
        h += os.map((o, i) => optionHtml(o, i, i === 0 ? 'הכי מהיר' : (o[3].length === minT ? 'הכי פחות החלפות' : ''))).join('');
      }
      if (e && e.d && e.d.length) {
        h += `<h4>קווים ישירים מ${esc(r.city.name)} (יציאות בין 6:00 ל-9:30)</h4><table class="tr-tab"><thead><tr><th>קו</th><th>יציאות</th><th>ראשונה–אחרונה</th><th>זמן נסיעה</th></tr></thead><tbody>` +
          e.d.map(d => `<tr><td>${ICON[d[0]] || ''} <button type="button" class="tr-showline" data-line="${esc(d[0] + '|' + d[1] + '|' + d[2])}" title="הצגת הקו במפה">${esc(lineName(d[0], d[1], d[2]))} 🗺️</button></td><td>${d[5]}</td><td>${hm(d[3])}–${hm(d[4])}</td><td>${d[6]} דק׳</td></tr>`).join('') + '</tbody></table>';
      }
      const car = C && carEstimate(r.city, C.ll);
      if (car) h += `<p class="tr-note">🚗 ברכב: כ-${car.km} ק״מ, בערך ${car.min} דק׳ בלי פקקים (הערכה לפי מרחק, לא מסלול אמיתי).</p>`;
    }
    if (C) {
      const L = C.lines.filter(l => l[0] === 'bus');
      if (C.rail.length || C.lrt.length || C.cable.length) {
        h += '<h4>תחנות רכבת ליד הקמפוס</h4><ul class="tr-st">' +
          C.rail.map(s => `<li>🚆 ${esc(s[0])} – ${s[1] < 1000 ? s[1] + ' מ׳' : (s[1] / 1000).toFixed(1) + ' ק״מ'} (כ-${Math.round(s[1] / 75)} דק׳ הליכה)</li>`).join('') +
          C.lrt.map(s => `<li>🚈 ${esc(s[0])} – ${s[1]} מ׳</li>`).join('') +
          C.cable.map(s => `<li>🚡 ${esc(s[0])} – ${s[1]} מ׳</li>`).join('') + '</ul>';
      }
      if (L.length) h += `<h4>קווי אוטובוס שעוצרים ליד הקמפוס (${L.length})</h4><div class="tr-lines">` +
        L.map(l => `<span title="${esc(l[3])} · ${l[4]} נסיעות בבוקר">${esc(l[1])} <small>${esc(l[2])}</small></span>`).join('') + `</div><p class="tr-note">מספר הנסיעות בבוקר (6:00–12:00) מופיע כשמצביעים על הקו.</p>`;
      if (C.approx) h += `<p class="tr-note">ⓘ מיקום הקמפוס של ${esc(instName || '')} במפה משוער – יש לוודא את הכתובת המדויקת.</p>`;
    }
    h += `<h4>🗺️ מפה: קווי אוטובוס, רכבת ותחנות</h4><p class="tr-note">לחצו על קו כדי לראות את כל המסלול והתחנות שלו. לחיצה על תחנה מציגה פרטים.</p><div class="tr-mapbox" data-inst="${esc(instId)}" data-home="${esc(homeLL)}" data-homename="${esc(r ? r.city.name : '')}" data-route="${esc(routeKey)}"><div class="tr-map"></div><div class="tr-map-side"><div class="tr-map-tools"><span></span><button type="button" class="tr-clear">ניקוי המפה</button></div><div class="tr-map-lines">טוען…</div></div></div>`;
    h += `<section class="tr-pkbox" data-inst="${esc(instId)}" aria-label="חניה ליד הקמפוס"><h4>🅿️ חניה ליד הקמפוס</h4><p class="tr-note">חניונים בטווח של עד כ-1.3 ק״מ מהקמפוס, לפי גוגל מפות. מחירים ושעות: לא ידוע. יש לוודא ולבדוק מול החניון.</p><div class="tr-pkgrid"><div class="tr-pkmap"></div><ol class="tr-pklist"><li class="tr-note">טוען…</li></ol></div></section>`;
    const dest = encodeURIComponent((instName || '') + (homeName ? '' : ''));
    h += `<div class="tr-links"><a href="https://www.google.com/maps/dir/?api=1${homeName ? '&origin=' + encodeURIComponent(homeName) : ''}&destination=${C ? C.ll.join(',') : dest}&travelmode=transit" target="_blank" rel="noopener">מסלול בזמן אמת בגוגל מפות ↗</a><a href="https://moovitapp.com/tripplan/israel-1/poi/he?tll=${C ? C.ll.join('_') : ''}" target="_blank" rel="noopener">מוביט ↗</a></div>`;
    return h + '</div>';
  }
  // ===== מפה אינטראקטיבית (Leaflet + OpenStreetMap) =====
  let LP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (LP) return LP;
    LP = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
      const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; sc.onload = () => res(window.L); sc.onerror = rej; document.head.appendChild(sc);
    });
    return LP;
  }
  function decodePoly(str) {
    let i = 0, lat = 0, lng = 0; const out = [];
    while (i < str.length) {
      for (const k of [0, 1]) {
        let b, shift = 0, result = 0;
        do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const d = (result & 1) ? ~(result >> 1) : (result >> 1);
        if (k === 0) lat += d; else lng += d;
      }
      out.push([lat / 1e5, lng / 1e5]);
    }
    return out;
  }
  const COLORS = ['#1F4D3F', '#C2603F', '#5B6FB5', '#B8860B', '#8E44AD', '#16A085', '#D35400', '#2C3E50', '#C0392B', '#27AE60'];
  async function initMap(box) {
    if (!box || box.dataset.ready) return; box.dataset.ready = '1';
    const inst = box.dataset.inst;
    let M, L;
    const pkSec = box.parentElement && box.parentElement.querySelector(`.tr-pkbox[data-inst="${inst}"]`);
    try { M = await fetch(BASE + 'map/' + inst + '.json').then(r => r.json()); }
    catch (e) { box.querySelector('.tr-map-lines').textContent = 'לא ניתן היה לטעון את המפה כרגע.'; return; }
    try { L = await loadLeaflet(); }
    catch (e) { box.querySelector('.tr-map-lines').textContent = 'לא ניתן היה לטעון את המפה כרגע.'; initParking(pkSec, M, null); return; }
    const map = L.map(box.querySelector('.tr-map'), { scrollWheelZoom: false }).setView(M.ll, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    L.marker(M.ll, { title: 'הקמפוס' }).addTo(map).bindPopup('<b>🎓 הקמפוס</b>');
    initParking(pkSec, M, L);
    const active = new Map(); let ci = 0;
    function toggle(idx) {
      const ln = M.lines[idx]; if (!ln) return;
      const btn = box.querySelector(`.tr-lbtn[data-i="${idx}"]`);
      if (active.has(idx)) { map.removeLayer(active.get(idx)); active.delete(idx); if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.style.borderColor = ''; } return; }
      const col = COLORS[ci++ % COLORS.length];
      const g = L.layerGroup();
      const line = L.polyline(decodePoly(ln.p), { color: col, weight: 5, opacity: .85 }).addTo(g);
      ln.s.forEach((st, j) => L.circleMarker([st[1], st[2]], { radius: j === 0 || j === ln.s.length - 1 ? 6 : 4, color: col, weight: 2, fillColor: '#fff', fillOpacity: 1 })
        .bindPopup(`<b>${esc(st[0])}</b><br>${esc(lineName(ln.m, ln.n, ln.a))} לכיוון ${esc(ln.h)}<br>בנסיעה לדוגמה: ${hm(st[3])}`).addTo(g));
      g.addTo(map); active.set(idx, g);
      map.fitBounds(line.getBounds(), { padding: [20, 20] });
      if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.style.borderColor = col; }
    }
    const lb = box.querySelector('.tr-map-lines');
    lb.innerHTML = M.lines.length ? M.lines.map((ln, i) => `<button type="button" class="tr-lbtn" data-i="${i}" aria-pressed="false"><b>${ICON[ln.m] || '🚌'} ${esc(ln.n || MODEN[ln.m])}</b> <small>${esc(ln.a)} · לכיוון ${esc(ln.h)} · ${ln.c} נסיעות בבוקר</small></button>`).join('') : '<p class="tr-note">לא נמצאו קווים ליד הקמפוס.</p>';
    lb.addEventListener('click', e => { const b = e.target.closest('.tr-lbtn'); if (b) toggle(+b.dataset.i); });
    box.querySelector('.tr-clear').onclick = () => { [...active.keys()].forEach(toggle); map.setView(M.ll, 15); };
    box._showLine = key => {
      const [m, n, a] = key.split('|'); const idx = M.lines.findIndex(l => l.m === m && String(l.n) === n && l.a === a);
      if (idx < 0) { alertNote(box, 'הקו הזה לא עובר ליד הקמפוס, ולכן אין לנו את המסלול שלו במפה. אפשר לראות אותו במוביט.'); return; }
      if (!active.has(idx)) toggle(idx); else map.fitBounds(active.get(idx).getLayers()[0].getBounds(), { padding: [20, 20] });
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    // מסלול: הבית, הקמפוס והקו האחרון במסלול המהיר ביותר
    if (box.dataset.home) {
      const hl = box.dataset.home.split(',').map(Number);
      if (hl.length === 2 && !isNaN(hl[0])) {
        L.marker(hl, { title: 'נקודת היציאה', icon: L.divIcon({ className: 'tr-campus-ic', html: '🏠', iconSize: [30, 30] }) }).addTo(map).bindPopup(`<b>🏠 ${esc(box.dataset.homename || 'נקודת היציאה')}</b><br>אמצע היישוב, נקודת היציאה בחישוב`);
        const ri = box.dataset.route ? M.lines.findIndex(l => (l.m + '|' + l.n + '|' + l.a) === box.dataset.route) : -1;
        if (ri >= 0 && !active.has(ri)) toggle(ri);
        const pts = [hl, M.ll]; if (ri >= 0) active.get(ri).getLayers().forEach(x => { if (x.getBounds) { const b = x.getBounds(); pts.push(b.getSouthWest(), b.getNorthEast()); } });
        const fit = () => { map.stop(); map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], animate: false }); };
        fit(); setTimeout(fit, 400);
        alertNote(box, ri >= 0 ? 'במפה: נקודת היציאה (🏠), הקמפוס, והקו האחרון במסלול המהיר ביותר. קווים קודמים במסלול מופיעים בפירוט הנסיעה למעלה.' : 'במפה: נקודת היציאה (🏠) והקמפוס. הקווים במסלול לא עוברים ליד הקמפוס, ולכן הם מופיעים רק בפירוט הנסיעה.');
      }
    }
  }
  function initParking(sec, M, L) {
    if (!sec || sec.dataset.ready) return; sec.dataset.ready = '1';
    const P = M.parking || [];
    const list = sec.querySelector('.tr-pklist');
    if (!P.length) { list.innerHTML = '<li class="tr-note">מידע על חניונים ליד הקמפוס: לא ידוע. יש לוודא ולבדוק.</li>'; sec.querySelector('.tr-pkmap').remove(); sec.querySelector('.tr-pkgrid').style.display = 'block'; return; }
    list.innerHTML = P.map((p, i) => `<li><button type="button" data-i="${i}"><b>${esc(p[0])}</b><small>כ-${p[3]} מ׳ · ${Math.max(1, Math.round(p[3] / 75))} דק׳ הליכה</small></button> <a href="https://www.google.com/maps/dir/?api=1&destination=${p[1]},${p[2]}" target="_blank" rel="noopener">ניווט ↗</a></li>`).join('');
    if (!L) { sec.querySelector('.tr-pkmap').remove(); sec.querySelector('.tr-pkgrid').style.display = 'block'; return; }
    const map = L.map(sec.querySelector('.tr-pkmap'), { scrollWheelZoom: false }).setView(M.ll, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    L.marker(M.ll, { title: 'הקמפוס', icon: L.divIcon({ className: 'tr-campus-ic', html: '🎓', iconSize: [30, 30] }) }).addTo(map).bindPopup('<b>🎓 הקמפוס</b>');
    const mk = [];
    P.forEach((p, i) => {
      const m = L.marker([p[1], p[2]], { title: p[0], icon: L.divIcon({ className: 'tr-pk-ic', html: `<span>P</span><small>${i + 1}</small>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindPopup(`<b>🅿️ ${esc(p[0])}</b><br>כ-${p[3]} מ׳ מהקמפוס (כ-${Math.max(1, Math.round(p[3] / 75))} דק׳ הליכה)<br><a href="https://www.google.com/maps/dir/?api=1&destination=${p[1]},${p[2]}" target="_blank" rel="noopener">ניווט לחניון ↗</a>`).addTo(map);
      mk.push(m);
    });
    map.fitBounds(L.latLngBounds([M.ll, ...P.map(p => [p[1], p[2]])]), { padding: [30, 30] });
    list.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const m = mk[+b.dataset.i]; map.setView(m.getLatLng(), 17); m.openPopup(); });
  }
  (function css() {
    if (document.getElementById('kv-tr-pk-css')) return;
    const st = document.createElement('style'); st.id = 'kv-tr-pk-css';
    st.textContent = `.tr-pkbox{margin:18px 0 6px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.tr-pkgrid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px}@media (max-width:760px){.tr-pkgrid{grid-template-columns:minmax(0,1fr)}}
.tr-pkmap{height:340px;border-radius:10px;border:1px solid var(--line);z-index:0}
.tr-pklist{margin:0;padding:0 18px 0 0;max-height:340px;overflow:auto;font-size:.92rem}.tr-pklist li{margin:0 0 8px}
.tr-pklist button{border:0;background:none;padding:0;font:inherit;color:var(--ink);cursor:pointer;text-align:start}.tr-pklist button b{display:block;color:var(--pine)}.tr-pklist small{color:var(--muted)}
.tr-pk-ic span{display:grid;place-items:center;width:30px;height:30px;border-radius:7px;background:#1D4E89;color:#fff;font:700 18px Arial,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.tr-pk-ic small{position:absolute;top:-8px;inset-inline-end:-8px;background:#CF600C;color:#fff;border-radius:99px;font:700 11px Arial,sans-serif;padding:1px 5px}
.tr-campus-ic{font-size:24px;line-height:30px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}`;
    document.head.appendChild(st);
  })();
  function alertNote(box, t) { let n = box.querySelector('.tr-map-msg'); if (!n) { n = document.createElement('p'); n.className = 'tr-note tr-map-msg'; box.querySelector('.tr-map-side').prepend(n); } n.textContent = t; }
  async function mount(el, homeName, instId, instName, extraHtml) {
    el.innerHTML = await fullHtml(homeName, instId, instName) + (extraHtml || '');
    const box = el.querySelector('.tr-mapbox'); initMap(box);
    el.addEventListener('click', e => { const b = e.target.closest('.tr-showline'); if (b && box && box._showLine) box._showLine(b.dataset.line); });
  }
  window.KivunTransit = { mount, initMap, loadCities, loadCampus, loadPlaces, placeInfo, allPlaceNames, proxyNote, findCity, forCity, best, shortText, fullHtml, optionHtml, carEstimate, hm, norm };
})();
