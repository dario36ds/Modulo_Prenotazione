/* ═══════════════════════════════════════════
   shared.js — Al Solito Posto Pizzeria Gourmet
   Comportamenti comuni a tutte le pagine
   ═══════════════════════════════════════════ */

(function () {

  /* ── BURGER / MOBILE MENU ── */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.classList.toggle('no-scroll', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.classList.remove('no-scroll');
      burger.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        burger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.classList.remove('no-scroll');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* ── NAV SCROLL (solo index con nav fissa) ── */
  const mainNav = document.getElementById('mainNav');
  if (mainNav && !mainNav.classList.contains('is-sticky')) {
    window.addEventListener('scroll', () => {
      mainNav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  /* ── SMOOTH ANCHORS ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  /* ── SCROLL REVEAL ── */
  const ro = new IntersectionObserver(entries => {
    entries.forEach(x => {
      if (x.isIntersecting) {
        x.target.classList.add('visible');
        ro.unobserve(x.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale').forEach(el => ro.observe(el));

  /* ── COOKIE BANNER GDPR ── */
  const banner = document.getElementById('cookieBanner');
  if (banner) {
    const consent = localStorage.getItem('alsolito_cookie_consent');
    if (!consent) setTimeout(() => banner.classList.add('show'), 800);
    document.getElementById('cookieAccept')?.addEventListener('click', () => {
      localStorage.setItem('alsolito_cookie_consent', 'accepted');
      banner.classList.remove('show');
    });
    document.getElementById('cookieRefuse')?.addEventListener('click', () => {
      localStorage.setItem('alsolito_cookie_consent', 'refused');
      banner.classList.remove('show');
    });
  }

  /* ── ORARI LIVE ──
     Aperto: Lun, Mer, Gio, Ven, Sab, Dom  18:00–23:00
     Chiuso: Martedì
  ── */
  const clockEl = document.getElementById('clockDisplay');
  if (clockEl) {
    // Chiave: giorno della settimana (0=dom...6=sab)
    // Valori: { c:[apertura_min, chiusura_min] } (solo cena)
    // null = giorno chiuso
    const S = {
      0: { c: [1080, 1380] }, // Domenica  18:00–23:00
      1: { c: [1080, 1380] }, // Lunedì    18:00–23:00
      2: null,                 // Martedì   CHIUSO
      3: { c: [1080, 1380] }, // Mercoledì 18:00–23:00
      4: { c: [1080, 1380] }, // Giovedì   18:00–23:00
      5: { c: [1080, 1380] }, // Venerdì   18:00–23:00
      6: { c: [1080, 1380] }  // Sabato    18:00–23:00
    };
    const SOON = 30;
    const DI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
    const nowIT = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    const pad = n => String(n).padStart(2, '0');
    const hm = m => `${pad(~~(m/60))}:${pad(m%60)}`;
    const ds = d => { const h = ~~(d/60), m = d%60; return h&&m ? `${h}h e ${m} min` : h ? `${h}h` : `${m} min`; };

    function nxt(fd, fc) {
      for (let i = 1; i <= 7; i++) {
        const d = (fd + i) % 7, s = S[d];
        if (!s) continue;
        const slots = [s.p, s.c].filter(Boolean);
        for (const [o] of slots) return { day: d, open: o, daysAway: i };
      }
    }

    function getStatus(t) {
      const day = t.getDay(), cur = t.getHours() * 60 + t.getMinutes(), s = S[day];
      if (!s) {
        const nx = nxt(day, cur), l = nx.daysAway === 1 ? 'domani' : DI[nx.day];
        return { state: 'closed', main: 'Oggi siamo chiusi', sub: `Riapriamo <strong>${l}</strong> alle <strong>${hm(nx.open)}</strong>` };
      }
      const slots = [s.p, s.c].filter(Boolean);
      for (const [o, cl] of slots) {
        if (cur >= o && cur < cl) {
          const r = cl - cur;
          if (r <= SOON) return { state: 'soon', main: 'Chiude tra poco', sub: `Cucina aperta ancora <strong>${ds(r)}</strong> (fino alle <strong>${hm(cl)}</strong>).` };
          return { state: 'open', main: 'Siamo aperti!', sub: `Cucina aperta fino alle <strong>${hm(cl)}</strong>. Vieni o prenota!` };
        }
        if (cur < o) {
          const df = o - cur;
          if (df <= SOON) return { state: 'soon', main: 'Apre tra poco', sub: `Apriamo tra <strong>${ds(df)}</strong> (alle <strong>${hm(o)}</strong>).` };
          return { state: 'closed', main: 'Al momento chiusi', sub: `Prossima apertura alle <strong>${hm(o)}</strong> (tra ${ds(df)}).` };
        }
      }
      const nx = nxt(day, cur), l = nx.daysAway === 1 ? 'domani' : DI[nx.day];
      return { state: 'closed', main: 'Cucina chiusa', sub: `Riapriamo <strong>${l}</strong> alle <strong>${hm(nx.open)}</strong>.` };
    }

    const LABELS = { open: 'Aperto ora', closed: 'Chiuso', soon: 'Quasi aperti' };

    function renderOrari() {
      const t = nowIT(), st = getStatus(t);
      clockEl.textContent = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
      const pill = document.getElementById('statusPill');
      if (pill) {
        pill.className = 'status-pill ' + st.state;
        const lbl = document.getElementById('statusLabel');
        if (lbl) lbl.textContent = LABELS[st.state];
      }
      const main = document.getElementById('statusMain');
      const sub = document.getElementById('statusSub');
      if (main) main.textContent = st.main;
      if (sub) sub.innerHTML = st.sub;
      document.querySelectorAll('[data-day]').forEach(r => {
        r.classList.toggle('today', +r.dataset.day === t.getDay());
      });
    }
    renderOrari();
    setInterval(renderOrari, 1000);
  }

})();
