/* כיוון – תפריט אחיד לכל העמודים */
(function () {
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const TOOLS = [
    ['curricula.html', 'תוכניות לימודים', 'קורסים לפי שנים, השוואה בין מוסדות'],
    ['combos.html', 'שילובי תארים', 'אילו חוגים אפשר ללמוד יחד, תארים כפולים'],
    ['finance.html', 'סימולטור פיננסי', 'כמה יעלה התואר ומה מכסה אותו'],
    ['transit.html', 'זמני נסיעה', 'תחבורה ציבורית, קווים וחניונים'],
  ];
  const cur = f => (here === f ? ' aria-current="page"' : '');
  const toolCur = TOOLS.some(t => t[0] === here) || here === 'data.html';
  const COMPASS = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M32 5v54M5 32h54" stroke="currentColor" stroke-width="1.6" opacity=".55"/><path d="M32 9l6.5 23h-13z" fill="#E8761A"/><path d="M32 55l-6.5-23h13z" fill="currentColor"/><circle cx="32" cy="32" r="2.6" fill="#fff" stroke="currentColor" stroke-width="1.4"/></svg>';
  window.KIVUN_COMPASS = COMPASS;
  const h = document.createElement('header');
  h.className = 'kv-head';
  h.innerHTML = `<div class="in">
    <a class="kv-brand" href="index.html" aria-label="כיוון – לדף הבית">${COMPASS}כיוון</a>
    <button class="kv-burger" type="button" aria-expanded="false" aria-controls="kvNav" aria-label="תפריט">☰</button>
    <nav class="kv-nav" id="kvNav" aria-label="ניווט ראשי">
      <a href="index.html"${here === 'index.html' ? ' aria-current="page"' : ''}>מה ללמוד</a>
      <a href="grad.html"${cur('grad.html')}>תואר שני</a>
      <div class="kv-dd${toolCur ? ' cur' : ''}"><button type="button" aria-expanded="false">כלים ומידע</button>
        <div class="kv-menu">${TOOLS.map(t => `<a href="${t[0]}"${cur(t[0])}>${t[1]}<small>${t[2]}</small></a>`).join('')}<a href="data.html"${cur('data.html')}>מאגר הנתונים<small>תארים, מוסדות, מלגות, מחיה ואנשי קשר</small></a></div></div>
    </nav>
    <a class="kv-cta" href="index.html#quiz">לשאלון ההתאמה</a></div>`;
  const old = document.querySelector('header.top');
  if (old) old.before(h); else document.body.prepend(h);
  if (!document.querySelector('a.skip')) {
    const m = document.querySelector('main');
    if (m) {
      if (!m.id) m.id = 'main';
      if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
      const sk = document.createElement('a');
      sk.className = 'skip'; sk.href = '#' + m.id; sk.textContent = 'דילוג לתוכן';
      document.body.prepend(sk);
    }
  }
  // ===== מסגרת העמוד (עיצוב v2): פאנל, מספר מסך ואייקון =====
  const ICONS = {
    finance: '<svg viewBox="0 0 70 34"><path d="M2 17h14M54 17h14" stroke="#E8761A" stroke-width="2.4" stroke-linecap="round"/><circle cx="35" cy="17" r="14" fill="none" stroke="#E8761A" stroke-width="2.4"/><text x="35" y="22.5" text-anchor="middle" font-size="15" font-weight="800" fill="#E8761A" font-family="Arial">₪</text></svg>',
    transit: '<svg viewBox="0 0 70 34"><circle cx="12" cy="17" r="5" fill="#1F7A4D"/><path d="M20 17h28" stroke="#E8761A" stroke-width="3" stroke-linecap="round"/><circle cx="56" cy="17" r="6" fill="currentColor"/></svg>',
    curricula: '<svg viewBox="0 0 40 30"><rect x="1.5" y="1.5" width="37" height="27" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 9h22M9 15h22M9 21h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    combos: '<svg viewBox="0 0 54 30"><circle cx="18" cy="15" r="12.5" fill="#E8EFF7" stroke="currentColor" stroke-width="1.6"/><circle cx="36" cy="15" r="12.5" fill="#FFF0E3" fill-opacity=".85" stroke="#E8761A" stroke-width="1.6"/><path d="M24 15h6" stroke="#1F7A4D" stroke-width="2.6" stroke-linecap="round"/></svg>',
    grad: '<svg viewBox="0 0 64 36"><path d="M32 3L3 14l29 11 29-11z" fill="none" stroke="#1F7A4D" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 18.5V28c5 5 31 5 36 0v-9.5" fill="none" stroke="#1F7A4D" stroke-width="2.2"/></svg>',
    data: '<svg viewBox="0 0 46 34"><rect x="1.5" y="1.5" width="43" height="31" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M1.5 11.5h43M1.5 22h43M16 11.5v21M30 11.5v21" stroke="currentColor" stroke-width="1.8"/></svg>'
  };
  window.KIVUN_ICONS = ICONS;
  const PAGES = { 'index.html': ['index', '01'], 'finance.html': ['finance', '02'], 'transit.html': ['transit', '03'], 'curricula.html': ['curricula', '04'], 'combos.html': ['combos', '05'], 'grad.html': ['grad', '06'], 'data.html': ['data', '07'] };
  const pg = PAGES[here];
  const main = document.querySelector('main');
  if (pg) document.body.classList.add('kv-p-' + pg[0]);
  if (pg && main) {
    main.classList.add('kv-panel');
    if (pg[0] !== 'index') {
      const h1 = main.querySelector('h1') || document.querySelector('h1.kv-dh1');
      if (h1) {
        const ph = document.createElement('div');
        ph.className = 'kv-phead';
        const t = document.createElement('div');
        t.className = 'kv-ptitle';
        const sub0 = h1.nextElementSibling;
        const holder = h1.parentElement;
        t.appendChild(h1);
        if (sub0 && sub0.tagName === 'P') { sub0.classList.add('kv-psub'); t.appendChild(sub0); }
        else if (pg[0] === 'data') { const p = document.createElement('p'); p.className = 'kv-psub'; p.textContent = 'תארים · מוסדות · מלגות · מחיה · אנשי קשר'; t.appendChild(p); }
        ph.appendChild(t);
        const mk = document.createElement('div');
        mk.className = 'kv-pmark';
        mk.innerHTML = `<span class="kv-pnum" aria-hidden="true">${pg[1]}</span><span class="kv-picon" aria-hidden="true">${ICONS[pg[0]] || ''}</span>`;
        ph.appendChild(mk);
        main.prepend(ph);
        if (holder && holder !== main && !holder.children.length && !holder.textContent.trim()) holder.remove();
        if (pg[0] === 'data') { const tabs = document.querySelector('nav.tabs'); if (tabs) ph.after(tabs); }
      }
    }
  }
  const burger = h.querySelector('.kv-burger');
  burger.addEventListener('click', () => { const o = h.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  const dd = h.querySelector('.kv-dd'), ddb = dd.querySelector('button');
  ddb.addEventListener('click', e => { e.stopPropagation(); const o = dd.classList.toggle('open'); ddb.setAttribute('aria-expanded', o); });
  document.addEventListener('click', () => { dd.classList.remove('open'); ddb.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { dd.classList.remove('open'); h.classList.remove('open'); } });
  const SKEY = 'kivun_profile_v1';
  window.KivunState = {
    get() {
      try {
        const s = JSON.parse(localStorage.getItem(SKEY) || '{}') || {};
        if (!s.home) { const h0 = localStorage.getItem('kivun-home'); if (h0) s.home = h0; }
        return s;
      } catch (e) { return {}; }
    },
    set(patch) {
      try {
        const cur = this.get();
        const next = Object.assign({}, cur, patch);
        localStorage.setItem(SKEY, JSON.stringify(next));
        if (patch && patch.home) localStorage.setItem('kivun-home', patch.home);
      } catch (e) {}
    }
  };
})();
