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
  const toolCur = TOOLS.some(t => t[0] === here);
  const h = document.createElement('header');
  h.className = 'kv-head';
  h.innerHTML = `<div class="in">
    <a class="kv-brand" href="index.html" aria-label="כיוון – לדף הבית"><span class="blaze" aria-hidden="true"><i></i><i></i><i></i></span>כיוון</a>
    <button class="kv-burger" type="button" aria-expanded="false" aria-controls="kvNav" aria-label="תפריט">☰</button>
    <nav class="kv-nav" id="kvNav" aria-label="ניווט ראשי">
      <a href="index.html#quiz"${here === 'index.html' ? ' aria-current="page"' : ''}>מה ללמוד</a>
      <a href="grad.html"${cur('grad.html')}>תואר שני</a>
      <div class="kv-dd${toolCur ? ' cur' : ''}"><button type="button" aria-expanded="false">כלים</button>
        <div class="kv-menu">${TOOLS.map(t => `<a href="${t[0]}"${cur(t[0])}>${t[1]}<small>${t[2]}</small></a>`).join('')}</div></div>
      <a href="data.html"${cur('data.html')}>מאגר הנתונים</a>
    </nav></div>`;
  const old = document.querySelector('header.top');
  if (old) old.before(h); else document.body.prepend(h);
  const burger = h.querySelector('.kv-burger');
  burger.addEventListener('click', () => { const o = h.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  const dd = h.querySelector('.kv-dd'), ddb = dd.querySelector('button');
  ddb.addEventListener('click', e => { e.stopPropagation(); const o = dd.classList.toggle('open'); ddb.setAttribute('aria-expanded', o); });
  document.addEventListener('click', () => { dd.classList.remove('open'); ddb.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { dd.classList.remove('open'); h.classList.remove('open'); } });
})();
