/**
 * app.js - Student Website Engine
 * Renders Python Practicals lab manual dynamically from PracticalsStorage,
 * maintaining 100% fidelity with the reference website UI/UX, animations,
 * matrix code rain, boot sequence, search filtering, accordions, and copy buttons.
 */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    renderContent();
    initBootSequence();
    initCodeRain();
    initInteractions();
  }

  /**
   * Render overview, unit sections, and practical question cards from Storage
   */
  function renderContent() {
    if (!window.PracticalsStorage) return;

    const units = window.PracticalsStorage.loadUnits();
    const questions = window.PracticalsStorage.loadQuestions();

    // 1. Update hero dynamic counts if present
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub) {
      const unitText = units.length === 4 ? 'four units' : `${units.length} units`;
      heroSub.innerHTML = `${questions.length} solved programs, worked across ${unitText} &mdash; aim, logic, code and real output.`;
    }

    // 2. Render Overview List
    const overviewContainer = document.getElementById('overview-list');
    if (overviewContainer) {
      overviewContainer.innerHTML = '';
      units.forEach((unit, idx) => {
        const unitQuestions = questions.filter(q => q.unitId === unit.id);
        const count = unitQuestions.length;
        const roman = unit.num ? unit.num.replace(/^Unit\s+/i, '') : ['I', 'II', 'III', 'IV'][idx] || `${idx + 1}`;

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'unit-row';
        row.setAttribute('data-target', unit.id);
        row.innerHTML = `
          <span class="num">${roman}</span>
          <span class="info">
            <span class="t">${escapeHtml(unit.title)}</span>
            <span class="d">${count} solved programs</span>
          </span>
          <span class="count">${count}</span>
        `;
        overviewContainer.appendChild(row);
      });
    }

    // 3. Render Unit Sections
    const unitsContainer = document.getElementById('units-container');
    if (unitsContainer) {
      unitsContainer.innerHTML = '';
      units.forEach(unit => {
        const unitQuestions = questions.filter(q => q.unitId === unit.id);
        const section = document.createElement('section');
        section.className = 'unit-section';
        section.id = unit.id;

        let questionsHtml = '';
        if (unitQuestions.length === 0) {
          questionsHtml = `<div class="empty-msg">No programs currently available in this unit.</div>`;
        } else {
          unitQuestions.forEach(q => {
            const codeHighlighted = q.codeHtml || window.PracticalsStorage.highlightPython(q.code);
            const chartHtml = q.chartSrc ? `<img class="chart" src="${escapeHtml(q.chartSrc)}" alt="${escapeHtml(q.chartAlt || q.title)}" loading="lazy">` : '';
            const searchHay = (q.dataSearch || `${q.title} ${q.logic} ${q.category} ${q.tag}`).toLowerCase();

            questionsHtml += `
              <div class="q" data-search="${escapeHtml(searchHay)}" id="${escapeHtml(q.id)}">
                <button class="q-btn" aria-expanded="false">
                  <span class="tag">${escapeHtml(q.tag || 'Q')}</span>
                  <span class="ttl">${escapeHtml(q.title)}</span>
                  <span class="car">&#8250;</span>
                </button>
                <div class="q-panel">
                  <div class="q-body">
                    <div class="q-label">Logic</div>
                    <p class="q-logic">${q.logic}</p>
                    <div class="q-label">Program</div>
                    <div class="code-wrap">
                      <pre class="code"><code>${codeHighlighted}</code></pre>
                      <button class="copy-btn" type="button" aria-label="Copy code">copy</button>
                    </div>
                    <div class="q-label">${escapeHtml(q.outputLabel || 'Output')}</div>
                    <div class="out ${escapeHtml(q.outputClass || '')}">${escapeHtml(q.output)}</div>
                    ${chartHtml}
                  </div>
                </div>
              </div>
            `;
          });
        }

        section.innerHTML = `
          <div class="wrap">
            <div class="unit-head">
              <div class="num">${escapeHtml(unit.num)}</div>
              <h2>${escapeHtml(unit.title)}</h2>
              <p class="sub">${unitQuestions.length} solved programs &mdash; aim, logic, code and output</p>
            </div>
            <input class="search" type="text" placeholder="Search ${escapeHtml(unit.num)} programs&hellip;" aria-label="Search ${escapeHtml(unit.num)} programs">
            <div class="glass q-list">
              ${questionsHtml}
            </div>
          </div>
        `;

        unitsContainer.appendChild(section);
      });
    }

    // 4. Update Floating Nav Menu Units
    const fnavMenu = document.querySelector('.fnav-menu');
    if (fnavMenu) {
      // Keep Top button, clear units, re-add
      const adminLink = fnavMenu.querySelector('a.fnav-admin');
      fnavMenu.innerHTML = `<button type="button" data-target="hero">Top</button>`;
      units.forEach(unit => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-target', unit.id);
        btn.textContent = unit.num;
        fnavMenu.appendChild(btn);
      });
      // Re-add admin link
      const adminBtn = document.createElement('a');
      adminBtn.href = './admin.html';
      adminBtn.className = 'fnav-admin';
      adminBtn.innerHTML = '⚙️ Admin Panel';
      fnavMenu.appendChild(adminBtn);
    }
  }

  /**
   * Terminal boot sequence animation
   */
  function initBootSequence() {
    const questions = window.PracticalsStorage ? window.PracticalsStorage.loadQuestions() : [];
    const units = window.PracticalsStorage ? window.PracticalsStorage.loadUnits() : [];

    const bootLines = [
      ">>> import lab_manual",
      ">>> lab_manual.load(subject='Python Programming', semester=5)",
      `>>> Compiling ${questions.length || 62} solved programs across ${units.length || 4} units...`,
      ">>> Ready. Welcome, LJCCA."
    ];

    const boot = document.getElementById('boot');
    const hero = document.getElementById('hero');
    if (!boot || !hero) return;

    if (reduced) {
      boot.style.display = 'none';
      hero.classList.add('revealed');
      return;
    }

    function typeLine(el, text, cb) {
      let i = 0;
      el.classList.add('show');
      const t = setInterval(function () {
        el.textContent = text.slice(0, i);
        i++;
        if (i > text.length) {
          clearInterval(t);
          if (cb) cb();
        }
      }, 16);
    }

    let idx = 0;
    function next() {
      if (idx >= bootLines.length) {
        setTimeout(function () {
          boot.classList.add('hide');
          setTimeout(function () {
            hero.classList.add('revealed');
          }, 550);
        }, 700);
        return;
      }
      const span = document.createElement('span');
      span.className = 'ln';
      boot.appendChild(span);
      typeLine(span, bootLines[idx], function () {
        idx++;
        setTimeout(next, 260);
      });
    }

    next();
  }

  /**
   * Code rain canvas animation
   */
  function initCodeRain() {
    if (reduced) return;
    const canvas = document.getElementById('rain');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const glyphs = "01(){}[]<>=+-*/_:.".split("");
    const fontSize = 14;
    let cols, drops;

    function size() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -40);
    }

    size();
    window.addEventListener('resize', size);

    function draw() {
      ctx.fillStyle = 'rgba(7,12,20,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const g = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillStyle = Math.random() < 0.02 ? '#ffd43b' : '#25507a';
        ctx.fillText(g, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    setInterval(draw, 60);
  }

  /**
   * Bind event listeners for accordions, search, copy buttons, and navigation
   */
  function initInteractions() {
    // Accordion toggle using delegation
    document.addEventListener('click', function (e) {
      const qBtn = e.target.closest('.q-btn');
      if (qBtn) {
        const qCard = qBtn.closest('.q');
        if (qCard) {
          const isOpen = qCard.classList.toggle('open');
          qBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        return;
      }

      // Copy button
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        e.stopPropagation();
        const codeElement = copyBtn.parentElement.querySelector('code');
        if (codeElement) {
          const rawText = codeElement.innerText;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rawText).then(() => {
              const old = copyBtn.textContent;
              copyBtn.textContent = 'copied';
              setTimeout(() => {
                copyBtn.textContent = old;
              }, 1200);
            }).catch(() => {
              fallbackCopy(rawText, copyBtn);
            });
          } else {
            fallbackCopy(rawText, copyBtn);
          }
        }
        return;
      }

      // Floating nav toggle
      const fnavToggle = e.target.closest('#fnavToggle');
      if (fnavToggle) {
        const fnav = document.getElementById('fnav');
        if (fnav) fnav.classList.toggle('open');
        return;
      }

      // Floating menu item click (close menu)
      const fnavBtn = e.target.closest('.fnav-menu button');
      if (fnavBtn) {
        const fnav = document.getElementById('fnav');
        if (fnav) fnav.classList.remove('open');
        return;
      }

      // Internal smooth navigation
      const navTarget = e.target.closest('[data-target]');
      if (navTarget) {
        const targetId = navTarget.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({
            behavior: reduced ? 'auto' : 'smooth',
            block: 'start'
          });
        }
        return;
      }
    });

    // Per-unit search filtering using input event delegation
    document.addEventListener('input', function (e) {
      if (e.target && e.target.classList.contains('search')) {
        const input = e.target;
        const term = input.value.trim().toLowerCase();
        const section = input.closest('.unit-section');
        if (section) {
          const cards = section.querySelectorAll('.q');
          cards.forEach(q => {
            const hay = (q.getAttribute('data-search') || '').toLowerCase();
            q.style.display = (term === '' || hay.indexOf(term) !== -1) ? '' : 'none';
          });
        }
      }
    });
  }

  function fallbackCopy(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      const old = btn.textContent;
      btn.textContent = 'copied';
      setTimeout(() => { btn.textContent = old; }, 1200);
    } catch (err) {
      console.warn('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
