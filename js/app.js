/**
 * app.js - Student Website Engine
 * Supports 3-level academic portal:
 * 1. Semester Selection (Sem 1, Sem 3, Sem 5, etc.)
 * 2. Subject Selection (Python Programming, C Programming, Data Structures, etc.)
 * 3. Practicals Lab Manual (Solved programs with code, logic, and output)
 *
 * Preserves 100% fidelity to reference website animations, Matrix rain,
 * boot sequence, search filtering, accordions, and copy buttons.
 */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Active student state
  let currentSemesterId = null;
  let currentSubjectId = null;

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    initAcademicConstellation();
    initThemeToggle();
    bindPortalEvents();
    initInteractions();

    // Check URL parameters or initial route
    handleRouteFromUrl();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleRouteFromUrl);
  }

  /**
   * Parse URL search parameters (?sem=...&sub=...) and route to appropriate view
   */
  function handleRouteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const semParam = params.get('sem');
    const subParam = params.get('sub');

    if (semParam && subParam) {
      showManualView(semParam, subParam, false);
    } else if (semParam) {
      showSubjectsView(semParam, false);
    } else {
      showSemestersView(false);
    }
  }

  /* ==========================================================================
     1. VIEW 1: SEMESTER SELECTION VIEW
     ========================================================================== */

  function showSemestersView(updateHistory = true) {
    currentSemesterId = null;
    currentSubjectId = null;

    if (updateHistory) {
      const newUrl = window.location.pathname;
      history.pushState({ view: 'semesters' }, '', newUrl);
    }

    const semestersView = document.getElementById('portal-semesters-view');
    const subjectsView = document.getElementById('portal-subjects-view');
    const manualView = document.getElementById('portal-manual-view');
    const breadcrumbs = document.getElementById('masthead-breadcrumbs');
    const fnav = document.getElementById('fnav');

    if (semestersView) semestersView.style.display = 'block';
    if (subjectsView) subjectsView.style.display = 'none';
    if (manualView) manualView.style.display = 'none';
    if (breadcrumbs) breadcrumbs.style.display = 'none';
    if (fnav) fnav.style.display = 'none';

    renderSemesters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSemesters() {
    if (!window.PracticalsStorage) return;

    const semesters = window.PracticalsStorage.loadSemesters();
    const subjects = window.PracticalsStorage.loadSubjects();
    const questions = window.PracticalsStorage.loadQuestions();
    const container = document.getElementById('semesters-grid');
    if (!container) return;

    container.innerHTML = '';

    semesters.forEach(sem => {
      const semSubjects = subjects.filter(s => s.semesterId === sem.id);
      const semQuestions = questions.filter(q => q.semesterId === sem.id);

      const card = document.createElement('div');
      card.className = 'glass semester-card';
      card.setAttribute('data-sem-id', sem.id);

      let subjectsPreview = '';
      if (semSubjects.length > 0) {
        subjectsPreview = semSubjects.map(s => `<span class="sem-subj-tag">${escapeHtml(s.icon || '📚')} ${escapeHtml(s.name)}</span>`).join(' ');
      } else {
        subjectsPreview = '<span style="color: var(--text-dim); font-size: 12px;">No subjects added yet</span>';
      }

      card.innerHTML = `
        <div class="sem-badge">${escapeHtml(sem.name)}</div>
        <h3 class="sem-title">${escapeHtml(sem.title)}</h3>
        <p class="sem-desc">${escapeHtml(sem.desc || 'Explore lab manuals, programs & solutions.')}</p>
        
        <div class="sem-stats-row">
          <div class="sem-stat">
            <span class="v">${semSubjects.length}</span>
            <span class="l">Subjects</span>
          </div>
          <div class="sem-stat">
            <span class="v">${semQuestions.length}</span>
            <span class="l">Practicals</span>
          </div>
        </div>

        <div class="sem-preview-tags">
          ${subjectsPreview}
        </div>

        <button type="button" class="clay-btn sem-select-btn" data-sem-target="${escapeHtml(sem.id)}">
          Explore Subjects &rarr;
        </button>
      `;

      container.appendChild(card);
    });
  }

  /* ==========================================================================
     2. VIEW 2: SUBJECT SELECTION VIEW
     ========================================================================== */

  function showSubjectsView(semesterId, updateHistory = true) {
    if (!window.PracticalsStorage) return;

    const semObj = window.PracticalsStorage.getSemesterById(semesterId);
    if (!semObj) {
      showSemestersView(true);
      return;
    }

    currentSemesterId = semesterId;
    currentSubjectId = null;

    if (updateHistory) {
      const newUrl = `${window.location.pathname}?sem=${encodeURIComponent(semesterId)}`;
      history.pushState({ view: 'subjects', sem: semesterId }, '', newUrl);
    }

    const semestersView = document.getElementById('portal-semesters-view');
    const subjectsView = document.getElementById('portal-subjects-view');
    const manualView = document.getElementById('portal-manual-view');
    const breadcrumbs = document.getElementById('masthead-breadcrumbs');
    const fnav = document.getElementById('fnav');

    if (semestersView) semestersView.style.display = 'none';
    if (subjectsView) subjectsView.style.display = 'block';
    if (manualView) manualView.style.display = 'none';
    if (breadcrumbs) breadcrumbs.style.display = 'flex';
    if (fnav) fnav.style.display = 'none';

    // Update Masthead Breadcrumbs
    const crumbSem = document.getElementById('crumb-sem-name');
    if (crumbSem) crumbSem.textContent = semObj.name;
    const subSep = document.getElementById('crumb-sub-sep');
    const subName = document.getElementById('crumb-sub-name');
    if (subSep) subSep.style.display = 'none';
    if (subName) subName.style.display = 'none';

    // Update View Header
    const semBadge = document.getElementById('subject-view-sem-badge');
    const titleEl = document.getElementById('subject-view-title');
    const descEl = document.getElementById('subject-view-desc');
    if (semBadge) semBadge.textContent = `${semObj.name} &bull; ${semObj.title}`;
    if (titleEl) titleEl.textContent = `${semObj.name} Subjects`;
    if (descEl) descEl.textContent = `Select a subject in ${semObj.name} to view its practical questions, logic, and code.`;

    renderSubjectPills(semesterId);
    renderSubjects(semesterId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSubjectPills(activeSemId) {
    const container = document.getElementById('portal-sem-pills');
    if (!container || !window.PracticalsStorage) return;

    const semesters = window.PracticalsStorage.loadSemesters();
    container.innerHTML = '';

    semesters.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sem-pill-btn ${s.id === activeSemId ? 'active' : ''}`;
      btn.textContent = s.name;
      btn.addEventListener('click', () => {
        showSubjectsView(s.id, true);
      });
      container.appendChild(btn);
    });
  }

  function renderSubjects(semesterId) {
    if (!window.PracticalsStorage) return;

    const subjects = window.PracticalsStorage.loadSubjects(semesterId);
    const questions = window.PracticalsStorage.loadQuestions();
    const units = window.PracticalsStorage.loadUnits();
    const container = document.getElementById('subjects-grid');
    if (!container) return;

    container.innerHTML = '';

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="glass" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px;">📁</div>
          <h3 style="margin: 0 0 8px; font-family: var(--mono);">No Subjects Found</h3>
          <p style="color: var(--text-muted); font-size: 14px; max-width: 480px; margin: 0 auto 18px;">
            No subjects have been created for this semester yet. The administrator can add subjects from the Admin Panel.
          </p>
          <a href="./admin.html" class="clay-btn" style="display: inline-flex;">Go to Admin Panel &rarr;</a>
        </div>
      `;
      return;
    }

    subjects.forEach(sub => {
      const subQuestions = questions.filter(q => q.subjectId === sub.id);
      const subUnits = units.filter(u => u.subjectId === sub.id);

      const card = document.createElement('div');
      card.className = 'glass subject-card';
      card.setAttribute('data-sub-id', sub.id);

      card.innerHTML = `
        <div class="sub-icon-row">
          <span class="sub-icon">${sub.icon || '📚'}</span>
          <span class="sub-code">${escapeHtml(sub.code || 'BSCA')}</span>
        </div>
        <h3 class="sub-name">${escapeHtml(sub.name)}</h3>
        <p class="sub-desc">${escapeHtml(sub.desc || 'Solved practical programs with aim, logic, code and output.')}</p>

        <div class="sub-meta-row">
          <span><b>${subQuestions.length}</b> Practicals</span>
          <span>&bull;</span>
          <span><b>${subUnits.length}</b> Units</span>
        </div>

        <button type="button" class="clay-btn sub-open-btn" data-sub-target="${escapeHtml(sub.id)}" data-sem-target="${escapeHtml(semesterId)}">
          Open Lab Manual &rarr;
        </button>
      `;

      container.appendChild(card);
    });
  }

  /* ==========================================================================
     3. VIEW 3: PRACTICAL LAB MANUAL VIEW
     ========================================================================== */

  function showManualView(semesterId, subjectId, updateHistory = true) {
    if (!window.PracticalsStorage) return;

    const subObj = window.PracticalsStorage.getSubjectById(subjectId);
    const semObj = window.PracticalsStorage.getSemesterById(semesterId) || (subObj ? window.PracticalsStorage.getSemesterById(subObj.semesterId) : null);

    if (!subObj) {
      showSubjectsView(semesterId, true);
      return;
    }

    currentSemesterId = semObj ? semObj.id : semesterId;
    currentSubjectId = subjectId;

    if (updateHistory) {
      const newUrl = `${window.location.pathname}?sem=${encodeURIComponent(currentSemesterId)}&sub=${encodeURIComponent(subjectId)}`;
      history.pushState({ view: 'manual', sem: currentSemesterId, sub: subjectId }, '', newUrl);
    }

    const semestersView = document.getElementById('portal-semesters-view');
    const subjectsView = document.getElementById('portal-subjects-view');
    const manualView = document.getElementById('portal-manual-view');
    const breadcrumbs = document.getElementById('masthead-breadcrumbs');
    const fnav = document.getElementById('fnav');

    if (semestersView) semestersView.style.display = 'none';
    if (subjectsView) subjectsView.style.display = 'none';
    if (manualView) manualView.style.display = 'block';
    if (breadcrumbs) breadcrumbs.style.display = 'flex';
    if (fnav) fnav.style.display = 'flex';

    // Update Masthead Breadcrumbs
    const crumbSem = document.getElementById('crumb-sem-name');
    if (crumbSem && semObj) crumbSem.textContent = semObj.name;
    const subSep = document.getElementById('crumb-sub-sep');
    const subName = document.getElementById('crumb-sub-name');
    if (subSep) subSep.style.display = 'inline';
    if (subName) {
      subName.style.display = 'inline';
      subName.textContent = subObj.name;
    }

    // Top back button
    const backSemLabel = document.getElementById('manual-back-sem-label');
    if (backSemLabel && semObj) backSemLabel.textContent = `Back to ${semObj.name} Subjects`;

    const ctxSem = document.getElementById('manual-context-sem');
    const ctxSub = document.getElementById('manual-context-sub');
    if (ctxSem && semObj) ctxSem.textContent = semObj.name;
    if (ctxSub) ctxSub.textContent = subObj.name;

    // Render Hero for Subject
    const heroTitle = document.getElementById('manual-hero-title');
    const heroSub = document.getElementById('manual-hero-sub');
    const heroMeta = document.getElementById('manual-hero-meta');

    if (heroTitle) {
      heroTitle.innerHTML = `${escapeHtml(subObj.name)}<br>Practical Lab Manual`;
    }
    if (heroMeta && semObj) {
      heroMeta.textContent = `L J College of Computer Applications — ${semObj.name}`;
    }

    renderManualPracticals(currentSemesterId, currentSubjectId);
    initBootSequence(semObj, subObj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderManualPracticals(semesterId, subjectId) {
    if (!window.PracticalsStorage) return;

    const units = window.PracticalsStorage.loadUnits(subjectId, semesterId);
    const questions = window.PracticalsStorage.loadQuestions(subjectId, semesterId);
    const subObj = window.PracticalsStorage.getSubjectById(subjectId);

    // Update hero subtitle count
    const heroSub = document.getElementById('manual-hero-sub');
    if (heroSub) {
      const unitText = units.length === 1 ? '1 unit' : `${units.length} units`;
      heroSub.innerHTML = `${questions.length} solved programs, worked across ${unitText} &mdash; aim, logic, code and real output.`;
    }

    // 1. Render Overview List
    const overviewContainer = document.getElementById('overview-list');
    if (overviewContainer) {
      overviewContainer.innerHTML = '';
      if (units.length === 0) {
        overviewContainer.innerHTML = `<div style="padding: 16px; color: var(--text-dim); font-size: 13px;">No units registered for this subject yet.</div>`;
      } else {
        units.forEach((unit, idx) => {
          const unitQuestions = questions.filter(q => q.unitId === unit.id);
          const count = unitQuestions.length;
          const roman = unit.num ? unit.num.replace(/^Unit\s+/i, '') : `${idx + 1}`;

          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'unit-row';
          row.setAttribute('data-target', unit.id);
          row.innerHTML = `
            <span class="num">${escapeHtml(roman)}</span>
            <span class="info">
              <span class="t">${escapeHtml(unit.title)}</span>
              <span class="d">${count} solved programs</span>
            </span>
            <span class="count">${count}</span>
          `;
          overviewContainer.appendChild(row);
        });
      }
    }

    // 2. Render Unit Sections
    const unitsContainer = document.getElementById('units-container');
    if (unitsContainer) {
      unitsContainer.innerHTML = '';
      if (units.length === 0) {
        unitsContainer.innerHTML = `
          <section class="wrap" style="padding: 40px 0; text-align: center;">
            <div class="glass" style="padding: 30px 20px;">
              <h3 style="margin: 0 0 8px; font-family: var(--mono);">No Practicals Added Yet</h3>
              <p style="color: var(--text-muted); font-size: 14px; margin: 0 0 16px;">
                Practical programs for <b>${escapeHtml(subObj ? subObj.name : 'this subject')}</b> have not been published yet.
              </p>
              <a href="./admin.html" class="clay-btn" style="display: inline-flex;">Manage in Admin Panel &rarr;</a>
            </div>
          </section>
        `;
      } else {
        units.forEach(unit => {
          const unitQuestions = questions.filter(q => q.unitId === unit.id);
          const section = document.createElement('section');
          section.className = 'unit-section';
          section.id = unit.id;

          let questionsHtml = '';
          if (unitQuestions.length === 0) {
            questionsHtml = `<div class="empty-msg" style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13.5px;">No programs currently available in this unit.</div>`;
          } else {
            unitQuestions.forEach(q => {
              const codeHighlighted = q.codeHtml || window.PracticalsStorage.highlightCode(q.code);
              const imgSource = q.outputImage || q.chartSrc || '';
              const chartHtml = imgSource ? `
                <div class="output-image-wrap" style="margin-top: 14px;">
                  <div class="q-label">${q.output ? 'Output Image / Screenshot' : escapeHtml(q.outputLabel || 'Output')}</div>
                  <a href="${escapeHtml(imgSource)}" target="_blank" rel="noopener noreferrer" title="Click to open image in full size">
                    <img class="chart output-img" src="${escapeHtml(imgSource)}" alt="${escapeHtml(q.chartAlt || q.title || 'Program Output')}" loading="lazy">
                  </a>
                  ${q.chartAlt ? `<div style="font-size: 11.5px; color: var(--text-dim); margin-top: 4px; font-family: var(--mono); text-align: center;">${escapeHtml(q.chartAlt)}</div>` : ''}
                </div>` : '';

              const outputTextHtml = (q.output && q.output.trim()) ? `
                <div class="q-label">${escapeHtml(q.outputLabel || 'Output')}</div>
                <div class="out ${escapeHtml(q.outputClass || '')}">${escapeHtml(q.output)}</div>
              ` : '';

              const defaultOutHtml = (!q.output && !imgSource) ? `
                <div class="q-label">Output</div>
                <div class="out" style="color: var(--text-dim); font-style: italic;">Program executed successfully.</div>
              ` : '';

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
                      ${(q.logic && q.logic.trim()) ? `<div class="q-label">Logic</div><p class="q-logic">${q.logic}</p>` : ''}
                      <div class="q-label">Program</div>
                      <div class="code-wrap">
                        <pre class="code"><code>${codeHighlighted}</code></pre>
                        <button class="copy-btn" type="button" aria-label="Copy code">copy</button>
                      </div>
                      ${outputTextHtml}
                      ${chartHtml}
                      ${defaultOutHtml}
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
    }

    // 3. Update Floating Nav
    const fnavMenu = document.getElementById('fnav-menu-box');
    if (fnavMenu) {
      fnavMenu.innerHTML = `<button type="button" data-target="hero">Top</button>`;
      units.forEach(unit => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-target', unit.id);
        btn.textContent = unit.num;
        fnavMenu.appendChild(btn);
      });
      const adminBtn = document.createElement('a');
      adminBtn.href = './admin.html';
      adminBtn.className = 'fnav-admin';
      adminBtn.innerHTML = '⚙️ Admin Panel';
      fnavMenu.appendChild(adminBtn);
    }
  }

  /* ==========================================================================
     4. TERMINAL BOOT SEQUENCE ANIMATION
     ========================================================================== */

  function initBootSequence(semObj, subObj) {
    const boot = document.getElementById('boot');
    const hero = document.getElementById('hero');
    if (!boot || !hero) return;

    const subName = subObj ? subObj.name : 'Computer Applications';
    const semName = semObj ? semObj.name : 'Semester 5';
    const questions = window.PracticalsStorage ? window.PracticalsStorage.loadQuestions(subObj ? subObj.id : null) : [];
    const units = window.PracticalsStorage ? window.PracticalsStorage.loadUnits(subObj ? subObj.id : null) : [];

    boot.innerHTML = '';
    boot.className = 'boot';
    hero.classList.remove('revealed');

    if (reduced) {
      boot.style.display = 'none';
      hero.classList.add('revealed');
      return;
    }

    const bootLines = [
      `>>> LJCCA Academic Lab Manual Portal [v4.2]`,
      `>>> Loading Accredited Syllabus: ${subName} (${semName})`,
      `>>> Verifying ${questions.length} Solved Practicals across ${units.length} Syllabus Units...`,
      `>>> LJCCA Computer Applications Lab Ready.`
    ];

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
          }, 450);
        }, 500);
        return;
      }
      const span = document.createElement('span');
      span.className = 'ln';
      boot.appendChild(span);
      typeLine(span, bootLines[idx], function () {
        idx++;
        setTimeout(next, 220);
      });
    }

    next();
  }

  /* ==========================================================================
     5. ACADEMIC KNOWLEDGE CONSTELLATION CANVAS ANIMATION
     ========================================================================== */

  function initAcademicConstellation() {
    if (reduced) return;
    const canvas = document.getElementById('rain');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodeCount = Math.min(Math.floor((width * height) / 18000), 75);
    const nodes = [];

    const paletteDark = ['#fdb913', '#e5a000', '#60a5fa', '#bfdbfe', '#fde047'];
    const paletteLight = ['#003366', '#004080', '#e5a000', '#2563eb', '#059669'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
        colorIndex: Math.floor(Math.random() * paletteDark.length),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02
      });
    }

    function onResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);

    function render() {
      ctx.clearRect(0, 0, width, height);

      const isLight = document.body && document.body.classList.contains('light-theme');
      const palette = isLight ? paletteLight : paletteDark;
      const maxDist = 120;

      // Draw constellation connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isLight ? 0.22 : 0.28);
            ctx.strokeStyle = isLight
              ? `rgba(0, 51, 102, ${alpha})`
              : `rgba(253, 185, 19, ${alpha * 0.8})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw knowledge star nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;

        if (n.x < 0) n.x = width;
        else if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        else if (n.y > height) n.y = 0;

        const currentRadius = n.radius + Math.sin(n.pulse) * 0.5;
        const color = palette[n.colorIndex];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(currentRadius, 0.8), 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(render);
    }

    render();
  }

  /* ==========================================================================
     5B. PORTAL THEME TOGGLE (DARK / LIGHT ACADEMIC MODE)
     ========================================================================== */

  function initThemeToggle() {
    const themeBtn = document.getElementById('portal-theme-toggle-btn');
    if (!themeBtn) return;

    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('python_practicals_theme') || localStorage.getItem('python_practicals_admin_theme') || 'dark';
    } catch (e) {}

    applyPortalTheme(savedTheme);

    themeBtn.addEventListener('click', function () {
      const isLight = document.body.classList.contains('light-theme');
      applyPortalTheme(isLight ? 'dark' : 'light');
    });
  }

  function applyPortalTheme(theme) {
    const isLight = (theme === 'light');
    if (isLight) {
      document.body.classList.add('light-theme');
      document.documentElement.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.remove('light-theme');
    }

    try {
      localStorage.setItem('python_practicals_theme', isLight ? 'light' : 'dark');
      localStorage.setItem('python_practicals_admin_theme', isLight ? 'light' : 'dark');
    } catch (e) {}

    const themeBtn = document.getElementById('portal-theme-toggle-btn');
    if (themeBtn) {
      const icon = themeBtn.querySelector('.theme-icon');
      const text = themeBtn.querySelector('.theme-text');
      if (icon) icon.textContent = isLight ? '☀️' : '🌙';
      if (text) text.textContent = isLight ? 'Light' : 'Dark';
      themeBtn.setAttribute('title', isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    }
  }

  /* ==========================================================================
     6. PORTAL NAVIGATION & INTERACTION BINDINGS
     ========================================================================== */

  function bindPortalEvents() {
    // 1. Semester Card / Button Click in View 1
    document.addEventListener('click', function (e) {
      const semCard = e.target.closest('.semester-card');
      const semBtn = e.target.closest('[data-sem-target]');
      if (semBtn) {
        e.preventDefault();
        const semId = semBtn.getAttribute('data-sem-target');
        showSubjectsView(semId, true);
        return;
      }
      if (semCard && !e.target.closest('button')) {
        const semId = semCard.getAttribute('data-sem-id');
        showSubjectsView(semId, true);
        return;
      }

      // 2. Subject Card / Button Click in View 2
      const subBtn = e.target.closest('[data-sub-target]');
      const subCard = e.target.closest('.subject-card');
      if (subBtn) {
        e.preventDefault();
        const subId = subBtn.getAttribute('data-sub-target');
        const semId = subBtn.getAttribute('data-sem-target') || currentSemesterId;
        showManualView(semId, subId, true);
        return;
      }
      if (subCard && !e.target.closest('button')) {
        const subId = subCard.getAttribute('data-sub-id');
        showManualView(currentSemesterId, subId, true);
        return;
      }

      // 3. Breadcrumb buttons
      if (e.target.closest('#crumb-semesters-btn') || e.target.closest('#back-to-semesters-btn')) {
        e.preventDefault();
        showSemestersView(true);
        return;
      }

      if (e.target.closest('#crumb-subjects-btn') || e.target.closest('#back-to-subjects-btn')) {
        e.preventDefault();
        if (currentSemesterId) {
          showSubjectsView(currentSemesterId, true);
        } else {
          showSemestersView(true);
        }
        return;
      }
    });
  }

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

      // Floating menu item click
      const fnavBtn = e.target.closest('.fnav-menu button');
      if (fnavBtn) {
        const fnav = document.getElementById('fnav');
        if (fnav) fnav.classList.remove('open');
        return;
      }

      // Smooth scroll navigation to unit
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
