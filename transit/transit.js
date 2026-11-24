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
    if (i < 0) i = list.findIndex(c => norm(c[0]).startsWith(n) && n.length >= 3);
    if (i < 0) i = list.findIndex(c => n.startsWith(norm(c[0])) && norm(c[0]).length >= 3);
    return i < 0 ? null : { idx: i, name: list[i][0], lat: list[i][1], lon: list[i][2] };
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
      h += `<li><span class="tr-ico">${ICON[m] || '🚌'}</span><b>${esc(lineName(m, num, ag))}</b>${hs ? ` <small>לכיוון ${esc(hs)}</small>` : ''}<br><small>עולים ב<b>${esc(from)}</b> ${hm(dep)} ← יורדים ב<b>${esc(to)}</b> ${hm(ar)} (${ar - dep} דק׳)</small></li>`;
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
    let h = '<div class="tr-box">';
    if (!r) h += `<p class="tr-note">לא מצאנו את „${esc(homeName || '')}” בלוח הזמנים של התחבורה הציבורית. זמני הנסיעה: לא ידוע. יש לוודא ולבדוק – אפשר להשתמש בקישורים למטה.</p>`;
    else {
      const e = r.data[instId];
      h += `<h3>🚌 איך מגיעים מ${esc(r.city.name)}</h3><p class="tr-note">מחושב מלוח הזמנים הרשמי של משרד התחבורה (GTFS, עודכן ${cp ? cp.feed : ''}), ליום חול רגיל – יציאה מאמצע ${esc(r.city.name)} מ-7:00 בבוקר. זמנים בפועל משתנים לפי פקקים ושינויי קווים.</p>`;
      if (!e || !e.o.length) h += `<p class="tr-note">לא נמצאה נסיעה בתחבורה ציבורית שמגיעה עד 11:00 בבוקר (עד 3 החלפות).</p>`;
      else {
        const os = [...e.o].sort((x, y) => x[0] - y[0]);
        const minT = Math.min(...os.map(o => o[3].length));
        h += os.map((o, i) => optionHtml(o, i, i === 0 ? 'הכי מהיר' : (o[3].length === minT ? 'הכי פחות החלפות' : ''))).join('');
      }
      if (e && e.d && e.d.length) {
        h += `<h4>קווים ישירים מ${esc(r.city.name)} (יציאות בין 6:00 ל-9:30)</h4><table class="tr-tab"><thead><tr><th>קו</th><th>יציאות</th><th>ראשונה–אחרונה</th><th>זמן נסיעה</th></tr></thead><tbody>` +
          e.d.map(d => `<tr><td>${ICON[d[0]] || ''} ${esc(lineName(d[0], d[1], d[2]))}</td><td>${d[5]}</td><td>${hm(d[3])}–${hm(d[4])}</td><td>${d[6]} דק׳</td></tr>`).join('') + '</tbody></table>';
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
    const dest = encodeURIComponent((instName || '') + (homeName ? '' : ''));
    h += `<div class="tr-links"><a href="https://www.google.com/maps/dir/?api=1${homeName ? '&origin=' + encodeURIComponent(homeName) : ''}&destination=${C ? C.ll.join(',') : dest}&travelmode=transit" target="_blank" rel="noopener">מסלול בזמן אמת בגוגל מפות ↗</a><a href="https://moovitapp.com/tripplan/israel-1/poi/he?tll=${C ? C.ll.join('_') : ''}" target="_blank" rel="noopener">מוביט ↗</a></div>`;
    return h + '</div>';
  }
  window.KivunTransit = { loadCities, loadCampus, findCity, forCity, best, shortText, fullHtml, optionHtml, carEstimate, hm, norm };
})();
