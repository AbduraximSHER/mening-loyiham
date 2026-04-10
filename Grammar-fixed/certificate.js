/**
 * certificate.js — Completion Certificate
 * Shows on unit completion (score ≥ 80%) and course completion (all 100 units).
 * Call Certificate.show(unitTitle, unitId, score) from mark-done handler.
 */

const Certificate = {

  show(unitTitle, unitId, score, username) {
    if (score < 80) return;

    // Check if this is the course completion (all 100 units done)
    let completedCount = 0;
    try {
      const prog = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
      completedCount = (prog.completedUnits || []).length;
    } catch {}

    const isCourseComplete = completedCount >= 100;
    if (isCourseComplete) {
      this._showCourseComplete(score);
    } else {
      this._showUnitCert(unitTitle, unitId, score);
    }
  },

  _showUnitCert(unitTitle, unitId, score) {
    const grade     = score === 100 ? 'Perfect Score' : score >= 90 ? 'Excellent' : 'Great Work';
    const emoji     = score === 100 ? '🏆' : score >= 90 ? '⭐' : '✅';
    const date      = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });

    this._mount(`
      <div class="cert-card" id="certificate-card">
        <div class="cert-header">
          <div class="cert-brand-dot"></div>
          <div class="cert-emoji">${emoji}</div>
          <div class="cert-badge">Certificate of Completion</div>
          <div class="cert-brand">Grammar<em>hub</em></div>
        </div>
        <div class="cert-body">
          <p class="cert-sub">This certifies that <strong>you</strong> have successfully completed</p>
          <p class="cert-unit-num">Unit ${unitId}</p>
          <p class="cert-unit-title">${this._esc(unitTitle)}</p>
          <div class="cert-score-pill cert-score-pill--${score===100?'gold':score>=90?'blue':'green'}">
            <span class="cert-score-num">${score}%</span>
            <span class="cert-score-label">${grade}</span>
          </div>
          <p class="cert-date">${date}</p>
        </div>
        <div class="cert-stripe"></div>
      </div>
      <div class="cert-actions">
        <button class="cert-btn cert-btn--primary" onclick="Certificate.download()">📥 Save Image</button>
        <button class="cert-btn cert-btn--ghost"   onclick="Certificate.dismiss()">Continue →</button>
      </div>
    `);

    // Track
    if (window.Analytics) Analytics.trackAction('certificate_shown_unit_' + unitId, score);
  },

  _showCourseComplete(score) {
    const date = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });
    this._mount(`
      <div class="cert-card cert-card--course" id="certificate-card">
        <div class="cert-header cert-header--course">
          <div class="cert-brand-dot"></div>
          <div class="cert-emoji" style="font-size:4rem">🎓</div>
          <div class="cert-badge">Course Completion Certificate</div>
          <div class="cert-brand">Grammar<em>hub</em></div>
        </div>
        <div class="cert-body">
          <p class="cert-sub">This certifies the completion of</p>
          <p class="cert-unit-title" style="font-size:1.3rem">All 100 Units</p>
          <p class="cert-sub" style="margin-top:.25rem">Advanced English Grammar &amp; Vocabulary</p>
          <div class="cert-score-pill cert-score-pill--gold" style="margin-top:1.25rem">
            <span class="cert-score-num">✓</span>
            <span class="cert-score-label">Complete</span>
          </div>
          <p class="cert-date">${date}</p>
        </div>
        <div class="cert-stripe"></div>
      </div>
      <div class="cert-actions">
        <button class="cert-btn cert-btn--primary" onclick="Certificate.download()">📥 Save Certificate</button>
        <button class="cert-btn cert-btn--ghost"   onclick="Certificate.dismiss()">Close</button>
      </div>
    `);

    this._confetti(80);
    if (window.Analytics) Analytics.trackAction('certificate_course_complete');
  },

  _mount(inner) {
    // Inject styles once
    if (!document.getElementById('cert-styles')) {
      const s = document.createElement('style');
      s.id = 'cert-styles';
      s.textContent = `
        #cert-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;
          display:flex;align-items:center;justify-content:center;
          backdrop-filter:blur(6px);padding:1rem;
          opacity:0;transition:opacity .35s;
        }
        #cert-overlay.is-visible { opacity:1; }
        .cert-wrapper { max-width:480px;width:100%;transform:scale(.9);transition:transform .4s cubic-bezier(.34,1.56,.64,1); }
        #cert-overlay.is-visible .cert-wrapper { transform:scale(1); }

        .cert-card {
          background:#fff;border-radius:16px;overflow:hidden;
          box-shadow:0 25px 60px rgba(0,0,0,.3);
        }
        .cert-header {
          background:linear-gradient(135deg,#E8573A,#C9422A);
          padding:2rem 2rem 1.5rem;text-align:center;color:#fff;
          position:relative;overflow:hidden;
        }
        .cert-header--course { background:linear-gradient(135deg,#2E48FF,#1a2db3); }
        .cert-brand-dot {
          width:32px;height:32px;border-radius:50%;background:#fff;opacity:.2;
          position:absolute;top:1rem;left:1rem;
        }
        .cert-emoji { font-size:3rem;margin-bottom:.5rem; }
        .cert-badge { font-size:.7rem;text-transform:uppercase;letter-spacing:2px;opacity:.8;margin-bottom:.25rem; }
        .cert-brand { font-size:1.75rem;font-weight:700; }
        .cert-brand em { font-style:normal;opacity:.75; }

        .cert-body { padding:1.75rem 2rem;text-align:center; }
        .cert-sub { color:#64748b;font-size:.9rem;margin:0 0 .5rem; }
        .cert-unit-num { font-size:1rem;font-weight:600;color:#E8573A;margin:0 0 .2rem; }
        .cert-unit-title { font-size:1.05rem;color:#1e293b;margin:0 0 1rem;font-weight:500; }
        .cert-score-pill {
          display:inline-flex;align-items:center;gap:.5rem;
          padding:.45rem 1.2rem;border-radius:20px;margin-bottom:.75rem;
        }
        .cert-score-pill--gold  { background:#fefce8;color:#92400e; }
        .cert-score-pill--blue  { background:#eff6ff;color:#1e40af; }
        .cert-score-pill--green { background:#f0fdf4;color:#166534; }
        .cert-score-num   { font-weight:700;font-size:1.1rem; }
        .cert-score-label { font-size:.9rem; }
        .cert-date { color:#94a3b8;font-size:.8rem;margin:0; }

        .cert-stripe { height:5px;background:linear-gradient(90deg,#E8573A,#f59e0b,#2E48FF); }

        .cert-actions { display:flex;gap:.75rem;margin-top:1rem;justify-content:center;flex-wrap:wrap; }
        .cert-btn {
          padding:.7rem 1.5rem;border-radius:10px;border:none;
          font-weight:600;cursor:pointer;font-family:inherit;font-size:.9rem;
        }
        .cert-btn--primary { background:#E8573A;color:#fff; }
        .cert-btn--primary:hover { background:#c9422a; }
        .cert-btn--ghost { background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.3); }
        .cert-btn--ghost:hover { background:rgba(255,255,255,.25); }

        /* Dark mode */
        [data-theme="dark"] .cert-card { background:#1e293b; }
        [data-theme="dark"] .cert-sub { color:#94a3b8; }
        [data-theme="dark"] .cert-unit-title { color:#e2e8f0; }
        [data-theme="dark"] .cert-score-pill--gold  { background:#451a03;color:#fde68a; }
        [data-theme="dark"] .cert-score-pill--blue  { background:#1e3a5f;color:#bfdbfe; }
        [data-theme="dark"] .cert-score-pill--green { background:#052e16;color:#bbf7d0; }
        [data-theme="dark"] .cert-date { color:#64748b; }

        @keyframes confettiFall {
          0%   { transform:translateY(0) rotate(0deg);  opacity:1; }
          100% { transform:translateY(105vh) rotate(720deg); opacity:0; }
        }
      `;
      document.head.appendChild(s);
    }

    const overlay = document.createElement('div');
    overlay.id = 'cert-overlay';
    overlay.onclick = e => { if (e.target === overlay) this.dismiss(); };
    overlay.innerHTML = `<div class="cert-wrapper">${inner}</div>`;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    this._confetti(40);
  },

  dismiss() {
    const o = document.getElementById('cert-overlay');
    if (!o) return;
    o.classList.remove('is-visible');
    setTimeout(() => o.remove(), 400);
  },

  async download() {
    const card = document.getElementById('certificate-card');
    if (!card) return;
    try {
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(card, { scale:2, backgroundColor:'#ffffff', useCORS:true });
        const a = document.createElement('a');
        a.download = 'GrammarHub-Certificate.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        if (window.Analytics) Analytics.trackAction('certificate_downloaded');
      } else {
        alert('Tip: Use your browser\'s screenshot tool to save your certificate!');
      }
    } catch { alert('Take a screenshot to save your certificate!'); }
  },

  _confetti(count = 40) {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10001;overflow:hidden;';
    const colors = ['#E8573A','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#2E48FF'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      p.style.cssText = `
        position:absolute;top:-20px;left:${Math.random()*100}%;
        width:${size}px;height:${size*.6}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:2px;
        animation:confettiFall ${2+Math.random()*2}s ease-out ${Math.random()*.5}s forwards;
      `;
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  },

  _esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};

window.Certificate = Certificate;
