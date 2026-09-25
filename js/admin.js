/**
 * admin.js - Admin Dashboard Management Logic
 * Supports Multi-Semester (Sem 1, Sem 3, Sem 5, etc.) and Multi-Subject workflows,
 * dynamic Subject Add/Edit/Delete, Units CRUD, Practicals CRUD, PDF Export,
 * and client-side Authentication.
 */

(function () {
  'use strict';

  // Active Workspace State
  let currentSemesterId = null;
  let currentSubjectId = null;

  // Active Editing / Deleting IDs
  let currentEditingId = null;
  let currentDeletingId = null;
  let currentEditingUnitId = null;
  let currentDeletingUnitId = null;
  let currentEditingSubjectId = null;
  let currentDeletingSubjectId = null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  function initAdmin() {
    initTheme();
    initWorkspaceState();
    checkAuthState();
    bindAuthEvents();
    bindWorkspaceEvents();
    bindDashboardEvents();
    bindEditorEvents();
    bindUnitEvents();
    bindSubjectEvents();
    bindSemesterEvents();
    bindModalEvents();
  }

  /* ==========================================================================
     WORKSPACE INITIALIZATION (Semesters & Subjects State)
     ========================================================================== */

  function initWorkspaceState() {
    if (!window.PracticalsStorage) return;

    // Load saved or default active semester
    currentSemesterId = window.PracticalsStorage.getActiveSemesterId() || 'sem-5';

    // Verify semester exists
    const sem = window.PracticalsStorage.getSemesterById(currentSemesterId);
    if (!sem) {
      const allSems = window.PracticalsStorage.loadSemesters();
      currentSemesterId = allSems.length > 0 ? allSems[0].id : 'sem-5';
      window.PracticalsStorage.setActiveSemesterId(currentSemesterId);
    }

    // Load saved or default active subject for current semester
    const subjectsInSem = window.PracticalsStorage.loadSubjects(currentSemesterId);
    const savedSubId = window.PracticalsStorage.getActiveSubjectId();

    if (savedSubId && subjectsInSem.some(s => s.id === savedSubId)) {
      currentSubjectId = savedSubId;
    } else {
      currentSubjectId = subjectsInSem.length > 0 ? subjectsInSem[0].id : null;
      if (currentSubjectId) {
        window.PracticalsStorage.setActiveSubjectId(currentSubjectId);
      }
    }
  }

  function setWorkspaceSemester(semesterId) {
    if (!window.PracticalsStorage) return;
    currentSemesterId = semesterId;
    window.PracticalsStorage.setActiveSemesterId(semesterId);

    // Pick first subject in this semester or null
    const subjectsInSem = window.PracticalsStorage.loadSubjects(semesterId);
    currentSubjectId = subjectsInSem.length > 0 ? subjectsInSem[0].id : null;
    if (currentSubjectId) {
      window.PracticalsStorage.setActiveSubjectId(currentSubjectId);
    }

    renderSemesterPills();
    renderSubjectPills();
    renderDashboard();

    const semObj = window.PracticalsStorage.getSemesterById(semesterId);
    showToast(`Switched workspace to ${semObj ? semObj.name : semesterId}`, 'info', 1600);
  }

  function setWorkspaceSubject(subjectId) {
    if (!window.PracticalsStorage) return;
    currentSubjectId = subjectId;
    window.PracticalsStorage.setActiveSubjectId(subjectId);

    const subObj = window.PracticalsStorage.getSubjectById(subjectId);
    if (subObj && subObj.semesterId !== currentSemesterId) {
      currentSemesterId = subObj.semesterId;
      window.PracticalsStorage.setActiveSemesterId(currentSemesterId);
      renderSemesterPills();
    }

    renderSubjectPills();
    renderDashboard();

    if (subObj) {
      showToast(`Active Subject: ${subObj.name}`, 'info', 1600);
    }
  }

  /* ==========================================================================
     THEME TOGGLE (Dark Mode => White font / Light Mode => Black font)
     ========================================================================== */
  const THEME_STORAGE_KEY = 'python_practicals_admin_theme';

  function initTheme() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    } catch (e) {}

    applyTheme(savedTheme, false);

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  }

  function applyTheme(theme, showNotification = true) {
    const isLight = (theme === 'light');
    if (isLight) {
      document.body.classList.add('light-theme');
      document.documentElement.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.remove('light-theme');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
    } catch (e) {}

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      const iconEl = btn.querySelector('.theme-icon');
      const textEl = btn.querySelector('.theme-text');
      if (iconEl) iconEl.textContent = isLight ? '☀️' : '🌙';
      if (textEl) textEl.textContent = isLight ? 'Light Mode' : 'Dark Mode';
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      btn.setAttribute('title', isLight ? 'Switch to Dark Mode (White font)' : 'Switch to Light Mode (Black font)');
    });

    if (showNotification) {
      showToast(isLight ? '☀️ Light Mode activated (Black font)' : '🌙 Dark Mode activated (White font)', 'info', 2000);
    }
  }

  function toggleTheme() {
    const isCurrentlyLight = document.body.classList.contains('light-theme');
    applyTheme(isCurrentlyLight ? 'dark' : 'light', true);
  }

  /* ==========================================================================
     AUTHENTICATION STATE MANAGEMENT
     ========================================================================== */

  function checkAuthState() {
    const isAuth = window.PracticalsAuth && window.PracticalsAuth.isAuthenticated();
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (isAuth) {
      if (loginView) loginView.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'block';

      const userNameEl = document.getElementById('admin-user-display');
      if (userNameEl) {
        userNameEl.textContent = `User: ${window.PracticalsAuth.getCurrentUser() || 'admin'}`;
      }

      renderSemesterPills();
      renderSubjectPills();
      renderDashboard();
    } else {
      if (loginView) loginView.style.display = 'flex';
      if (dashboardView) dashboardView.style.display = 'none';
      renderLoginSemesterPills();
    }
  }

  function bindAuthEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const usernameInput = document.getElementById('admin-username');
        const passwordInput = document.getElementById('admin-password');
        const errorAlert = document.getElementById('login-error-alert');

        const res = window.PracticalsAuth.login(usernameInput.value, passwordInput.value);
        if (res.success) {
          if (errorAlert) errorAlert.style.display = 'none';
          showToast(res.message, 'success');
          checkAuthState();
        } else {
          if (errorAlert) {
            errorAlert.textContent = res.message;
            errorAlert.style.display = 'block';
          }
          showToast(res.message, 'error');
        }
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        window.PracticalsAuth.logout();
        showToast('Logged out successfully.', 'info');
        checkAuthState();
      });
    }
  }

  /* ==========================================================================
     WORKSPACE CONTROLS (SEMESTER & SUBJECT BARS)
     ========================================================================== */

  function renderLoginSemesterPills() {
    const container = document.getElementById('login-sem-pills');
    if (!container || !window.PracticalsStorage) return;

    const semesters = window.PracticalsStorage.loadSemesters();
    container.innerHTML = '';

    semesters.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sem-pill-btn ${s.id === currentSemesterId ? 'active' : ''}`;
      btn.textContent = `🎓 ${s.name}`;
      btn.addEventListener('click', function () {
        setWorkspaceSemester(s.id);
        renderLoginSemesterPills();
      });
      container.appendChild(btn);
    });
  }

  function renderSemesterPills() {
    const container = document.getElementById('admin-sem-pills');
    if (!container || !window.PracticalsStorage) return;

    const semesters = window.PracticalsStorage.loadSemesters();
    container.innerHTML = '';

    semesters.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `admin-sem-btn ${s.id === currentSemesterId ? 'active' : ''}`;
      btn.innerHTML = `<span>🎓</span> <b>${escapeHtml(s.name)}</b>`;
      btn.title = `Switch to ${s.title}`;
      btn.addEventListener('click', () => {
        setWorkspaceSemester(s.id);
      });
      container.appendChild(btn);
    });
  }

  function renderSubjectPills() {
    const container = document.getElementById('admin-sub-pills');
    if (!container || !window.PracticalsStorage) return;

    const subjects = window.PracticalsStorage.loadSubjects(currentSemesterId);
    const questions = window.PracticalsStorage.loadQuestions();
    container.innerHTML = '';

    if (subjects.length === 0) {
      container.innerHTML = `<span style="font-size: 12.5px; color: var(--text-dim); padding: 6px 10px;">No subjects added to this semester yet.</span>`;
      return;
    }

    subjects.forEach(sub => {
      const qCount = questions.filter(q => q.subjectId === sub.id).length;
      const pill = document.createElement('div');
      pill.className = `admin-sub-pill ${sub.id === currentSubjectId ? 'active' : ''}`;

      pill.innerHTML = `
        <button type="button" class="sub-tab-btn" data-sub-id="${escapeHtml(sub.id)}" title="${escapeHtml(sub.name)} (${escapeHtml(sub.code)})">
          <span>${sub.icon || '📚'}</span>
          <span class="name">${escapeHtml(sub.name)}</span>
          <span class="badge">${qCount}</span>
        </button>
        <button type="button" class="sub-edit-btn" data-sub-id="${escapeHtml(sub.id)}" title="Edit Subject Details">
          ✏️
        </button>
      `;

      pill.querySelector('.sub-tab-btn').addEventListener('click', () => {
        setWorkspaceSubject(sub.id);
      });

      pill.querySelector('.sub-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openSubjectEditorModal(sub.id);
      });

      container.appendChild(pill);
    });
  }

  function bindWorkspaceEvents() {
    // Add Semester Button
    const addSemBtn = document.getElementById('admin-add-sem-btn');
    if (addSemBtn) {
      addSemBtn.addEventListener('click', function () {
        openSemesterEditorModal();
      });
    }

    // Add Subject Button (Top Bar)
    const addSubBtn = document.getElementById('admin-add-sub-btn');
    if (addSubBtn) {
      addSubBtn.addEventListener('click', function () {
        openSubjectEditorModal(null);
      });
    }

    // Add Subject Button (Actions Bar)
    const addSubDirectBtn = document.getElementById('add-subject-direct-btn');
    if (addSubDirectBtn) {
      addSubDirectBtn.addEventListener('click', function () {
        openSubjectEditorModal(null);
      });
    }

    const addSubSecBtn = document.getElementById('add-subject-section-btn');
    if (addSubSecBtn) {
      addSubSecBtn.addEventListener('click', function () {
        openSubjectEditorModal(null);
      });
    }

    // Table edit subject details link
    const tableEditSubBtn = document.getElementById('table-edit-subject-btn');
    if (tableEditSubBtn) {
      tableEditSubBtn.addEventListener('click', function () {
        if (currentSubjectId) {
          openSubjectEditorModal(currentSubjectId);
        } else {
          openSubjectEditorModal(null);
        }
      });
    }
  }

  /* ==========================================================================
     DASHBOARD RENDERING & FILTERING
     ========================================================================== */

  function renderDashboard() {
    if (!window.PracticalsStorage) return;

    const semObj = window.PracticalsStorage.getSemesterById(currentSemesterId);
    const subObj = window.PracticalsStorage.getSubjectById(currentSubjectId);

    // Update Header sub label
    const headerTitle = document.getElementById('dash-header-title');
    const headerSub = document.getElementById('dash-header-sub');
    if (headerTitle && subObj) {
      headerTitle.textContent = `${subObj.name} &mdash; Admin Dashboard`;
    }
    if (headerSub && semObj && subObj) {
      headerSub.textContent = `LJCCA BS(CA) ${semObj.name} | Course Code: ${subObj.code}`;
    }

    // Active table label
    const tableActiveLabel = document.getElementById('table-active-subject-label');
    if (tableActiveLabel) {
      tableActiveLabel.textContent = subObj ? `${subObj.name} (${semObj ? semObj.name : ''} - ${subObj.code})` : 'Select a Subject';
    }

    // Scoped questions and units
    const questions = window.PracticalsStorage.loadQuestions(currentSubjectId, currentSemesterId);
    const units = window.PracticalsStorage.loadUnits(currentSubjectId, currentSemesterId);
    const allSubjectsInSem = window.PracticalsStorage.loadSubjects(currentSemesterId);

    // Stats
    const totalQEl = document.getElementById('stat-total-questions');
    const totalUnitsEl = document.getElementById('stat-total-units');
    const totalSubsEl = document.getElementById('stat-total-subjects');
    const activeWsEl = document.getElementById('stat-active-sem-sub');
    const tabQEl = document.getElementById('tab-questions-count');
    const tabUnitsEl = document.getElementById('tab-units-count');
    const tabSubsEl = document.getElementById('tab-subjects-count');

    if (totalQEl) totalQEl.textContent = questions.length;
    if (totalUnitsEl) totalUnitsEl.textContent = units.length;
    if (totalSubsEl) totalSubsEl.textContent = allSubjectsInSem.length;
    if (tabQEl) tabQEl.textContent = questions.length;
    if (tabUnitsEl) tabUnitsEl.textContent = units.length;
    if (tabSubsEl) tabSubsEl.textContent = allSubjectsInSem.length;
    if (activeWsEl && semObj) {
      activeWsEl.textContent = `${semObj.name} • ${subObj ? subObj.name.split(' ')[0] : 'None'}`;
    }

    // Populate Category Filter Dropdown
    const categories = new Set();
    questions.forEach(q => {
      if (q.category) categories.add(q.category.trim());
    });

    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      const currentSelected = catSelect.value;
      catSelect.innerHTML = '<option value="all">All Categories</option>';
      Array.from(categories).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentSelected) opt.selected = true;
        catSelect.appendChild(opt);
      });
    }

    // Populate Unit Filter Dropdown
    const unitSelect = document.getElementById('filter-unit');
    if (unitSelect) {
      const currentSelected = unitSelect.value;
      unitSelect.innerHTML = '<option value="all">All Units</option>';
      units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.num} (${questions.filter(q => q.unitId === u.id).length})`;
        if (u.id === currentSelected) opt.selected = true;
        unitSelect.appendChild(opt);
      });
    }

    filterAndRenderTable();
    renderUnitsTable();
    renderSubjectsTable();
  }

  function filterAndRenderTable() {
    const searchInput = document.getElementById('admin-search-input');
    const unitSelect = document.getElementById('filter-unit');
    const catSelect = document.getElementById('filter-category');

    const query = searchInput ? searchInput.value : '';
    const unitId = unitSelect ? unitSelect.value : 'all';
    const category = catSelect ? catSelect.value : 'all';

    const filtered = window.PracticalsStorage.searchQuestions(query, unitId, category, currentSubjectId, currentSemesterId);

    const countIndicator = document.getElementById('filtered-count-display');
    const totalInSubject = window.PracticalsStorage.loadQuestions(currentSubjectId, currentSemesterId).length;
    if (countIndicator) {
      countIndicator.textContent = `Showing ${filtered.length} of ${totalInSubject} practicals`;
    }

    const tbody = document.getElementById('questions-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px 16px; color: var(--text-dim); font-family: var(--mono);">
            No matching practical questions found for this subject. Click "+ Add New Practical" to create one.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach(q => {
      rowsHtml += `
        <tr data-id="${escapeHtml(q.id)}">
          <td>
            <span class="tag-badge">${escapeHtml(q.tag || 'Q')}</span>
          </td>
          <td>
            <span class="unit-badge edit-unit-trigger" data-unit-id="${escapeHtml(q.unitId)}" title="Click to edit unit ${escapeHtml(q.unitNum || q.unitId)}" style="cursor: pointer;">${escapeHtml(q.unitNum || q.unitId)} ✏️</span>
            <span style="font-family: var(--mono); font-size: 12px; color: var(--text-dim); margin-left: 6px;">Prac #${escapeHtml(String(q.practicalNumber || ''))}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text);">${escapeHtml(q.title)}</div>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 3px; max-width: 480px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(q.logic ? q.logic.replace(/<[^>]*>/g, '') : '')}
            </div>
          </td>
          <td>
            <span class="category-badge">${escapeHtml(q.category || 'General')}</span>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="action-btn preview-btn" data-id="${escapeHtml(q.id)}" title="Preview question as students see it">
                Preview
              </button>
              <button type="button" class="action-btn edit-btn" data-id="${escapeHtml(q.id)}" title="Edit question details">
                Edit
              </button>
              <button type="button" class="action-btn del delete-btn" data-id="${escapeHtml(q.id)}" title="Delete question">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  }

  function bindDashboardEvents() {
    // Search input
    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) searchInput.addEventListener('input', filterAndRenderTable);

    // Unit filter
    const unitSelect = document.getElementById('filter-unit');
    if (unitSelect) unitSelect.addEventListener('change', filterAndRenderTable);

    // Category filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.addEventListener('change', filterAndRenderTable);

    // Questions Table Actions
    const tbody = document.getElementById('questions-table-body');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        const unitTrigger = e.target.closest('.edit-unit-trigger');
        if (unitTrigger) {
          const unitId = unitTrigger.getAttribute('data-unit-id');
          if (unitId) openUnitEditorModal(unitId);
          return;
        }

        const previewBtn = e.target.closest('.preview-btn');
        if (previewBtn) {
          const id = previewBtn.getAttribute('data-id');
          openPreviewModal(id);
          return;
        }

        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          openEditorModal(id);
          return;
        }

        const delBtn = e.target.closest('.delete-btn');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          openDeleteConfirmModal(id);
          return;
        }
      });
    }

    // Tabs Switching (Questions vs Units vs Subjects)
    const tabQuestionsBtn = document.getElementById('tab-questions-btn');
    const tabUnitsBtn = document.getElementById('tab-units-btn');
    const tabSubjectsBtn = document.getElementById('tab-subjects-btn');

    const secQuestions = document.getElementById('section-questions');
    const secUnits = document.getElementById('section-units');
    const secSubjects = document.getElementById('section-subjects');

    function switchDashboardTab(target) {
      [tabQuestionsBtn, tabUnitsBtn, tabSubjectsBtn].forEach(b => b && b.classList.remove('active'));
      [secQuestions, secUnits, secSubjects].forEach(s => s && (s.style.display = 'none'));

      if (target === 'units') {
        if (tabUnitsBtn) tabUnitsBtn.classList.add('active');
        if (secUnits) secUnits.style.display = 'block';
        renderUnitsTable();
      } else if (target === 'subjects') {
        if (tabSubjectsBtn) tabSubjectsBtn.classList.add('active');
        if (secSubjects) secSubjects.style.display = 'block';
        renderSubjectsTable();
      } else {
        if (tabQuestionsBtn) tabQuestionsBtn.classList.add('active');
        if (secQuestions) secQuestions.style.display = 'block';
        filterAndRenderTable();
      }
    }

    if (tabQuestionsBtn) tabQuestionsBtn.addEventListener('click', () => switchDashboardTab('questions'));
    if (tabUnitsBtn) tabUnitsBtn.addEventListener('click', () => switchDashboardTab('units'));
    if (tabSubjectsBtn) tabSubjectsBtn.addEventListener('click', () => switchDashboardTab('subjects'));

    // Manage Units button
    const manageUnitsBtn = document.getElementById('manage-units-btn');
    if (manageUnitsBtn) {
      manageUnitsBtn.addEventListener('click', function () {
        switchDashboardTab('units');
        if (secUnits) secUnits.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Add Question Button
    const addBtn = document.getElementById('add-question-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        openEditorModal(null);
      });
    }

    // Export PDF Button (.pdf format)
    const exportPdfBtn = document.getElementById('export-questions-pdf-btn');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', function () {
        const subObj = window.PracticalsStorage.getSubjectById(currentSubjectId);
        const subTitle = subObj ? subObj.name : 'Lab Manual';

        showToast(`Generating ${subTitle} PDF manual, please wait...`, 'info', 1800);
        setTimeout(function () {
          const success = window.PracticalsStorage.exportQuestionsPDF(currentSubjectId, currentSemesterId);
          if (success) {
            showToast(`Downloaded ${subTitle} PDF manual successfully!`, 'success');
          }
        }, 150);
      });
    }

    // Credentials Modal
    const openCredsBtn = document.getElementById('open-credentials-btn');
    if (openCredsBtn) {
      openCredsBtn.addEventListener('click', function () {
        const credModal = document.getElementById('credentials-modal');
        const credForm = document.getElementById('credentials-form');
        if (credForm) credForm.reset();
        const creds = window.PracticalsAuth.getCredentials();
        const userField = document.getElementById('cred-new-username');
        if (userField) userField.value = creds.username;
        if (credModal) credModal.classList.add('active');
      });
    }

    const credForm = document.getElementById('credentials-form');
    if (credForm) {
      credForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const currentPass = document.getElementById('cred-current-password').value;
        const newUser = document.getElementById('cred-new-username').value;
        const newPass = document.getElementById('cred-new-password').value;
        const confirmPass = document.getElementById('cred-confirm-password').value;

        if (newPass !== confirmPass) {
          showToast('Validation Error: New passwords do not match.', 'error');
          document.getElementById('cred-confirm-password').focus();
          return;
        }

        const res = window.PracticalsAuth.updateCredentials(currentPass, newUser, newPass);
        if (res.success) {
          showToast(res.message, 'success');
          const userDisplay = document.getElementById('admin-user-display');
          if (userDisplay) userDisplay.textContent = `User: ${newUser}`;
          closeModal('credentials-modal');
        } else {
          showToast(res.message, 'error');
        }
      });
    }

    const credResetBtn = document.getElementById('cred-reset-btn');
    if (credResetBtn) {
      credResetBtn.addEventListener('click', function () {
        if (confirm('Reset admin credentials back to default (Username: admin, Password: admin123)?')) {
          const res = window.PracticalsAuth.resetCredentialsToDefault();
          if (res.success) {
            showToast(res.message, 'info');
            const userDisplay = document.getElementById('admin-user-display');
            if (userDisplay) userDisplay.textContent = 'User: admin';
            closeModal('credentials-modal');
          } else {
            showToast(res.message, 'error');
          }
        }
      });
    }

    // Export JSON Button
    const exportBtn = document.getElementById('export-questions-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        window.PracticalsStorage.exportQuestionsJSON(currentSubjectId, currentSemesterId);
        showToast('Exported backup data as JSON', 'success');
      });
    }

    // Import Button & Hidden File Input
    const importBtn = document.getElementById('import-questions-btn');
    const importInput = document.getElementById('import-file-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function () {
        importInput.click();
      });

      importInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
          const content = evt.target.result;
          const result = window.PracticalsStorage.importQuestionsJSON(content);
          if (result.success) {
            showToast(`${result.message} (${result.count} questions)`, 'success');
            initWorkspaceState();
            renderSemesterPills();
            renderSubjectPills();
            renderDashboard();
          } else {
            showToast(result.message, 'error');
          }
          importInput.value = '';
        };
        reader.onerror = function () {
          showToast('Failed to read selected file.', 'error');
          importInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // Reset Defaults Button
    const resetBtn = document.getElementById('reset-defaults-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset all data back to original defaults across all semesters? Any browser modifications will be restored.')) {
          window.PracticalsStorage.resetToDefaults();
          showToast('Data reset to defaults successfully.', 'info');
          initWorkspaceState();
          renderSemesterPills();
          renderSubjectPills();
          renderDashboard();
        }
      });
    }
  }

  /* ==========================================================================
     QUESTION EDITOR MODAL (Scoped to Semester & Subject)
     ========================================================================== */

  function populateEditorDropdowns(selectedSemId = null, selectedSubId = null, selectedUnitId = null) {
    const semSelect = document.getElementById('field-semester');
    const subSelect = document.getElementById('field-subject');
    const unitSelect = document.getElementById('field-unit');

    if (!semSelect || !subSelect || !unitSelect || !window.PracticalsStorage) return;

    // 1. Populate Semesters
    const semesters = window.PracticalsStorage.loadSemesters();
    const activeSem = selectedSemId || currentSemesterId || (semesters[0] ? semesters[0].id : 'sem-5');
    semSelect.innerHTML = '';
    semesters.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.title})`;
      if (s.id === activeSem) opt.selected = true;
      semSelect.appendChild(opt);
    });

    // 2. Populate Subjects based on chosen semester
    function updateSubjectsDropdown(semId, targetSubId = null) {
      const subjects = window.PracticalsStorage.loadSubjects(semId);
      subSelect.innerHTML = '';
      if (subjects.length === 0) {
        subSelect.innerHTML = '<option value="">No subjects in this semester</option>';
        updateUnitsDropdown(null);
        return;
      }
      const activeSub = targetSubId || (subjects.some(s => s.id === currentSubjectId) ? currentSubjectId : subjects[0].id);
      subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = `${sub.icon || '📚'} ${sub.name} (${sub.code})`;
        if (sub.id === activeSub) opt.selected = true;
        subSelect.appendChild(opt);
      });
      updateUnitsDropdown(subSelect.value, selectedUnitId);
    }

    // 3. Populate Units based on chosen subject
    function updateUnitsDropdown(subId, targetUnitId = null) {
      unitSelect.innerHTML = '';
      if (!subId) {
        unitSelect.innerHTML = '<option value="">No units available</option>';
        return;
      }
      const units = window.PracticalsStorage.loadUnits(subId);
      if (units.length === 0) {
        unitSelect.innerHTML = '<option value="">No units found (Click + Add Unit)</option>';
        return;
      }
      const activeUnit = targetUnitId || (units[0] ? units[0].id : '');
      units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.num} — ${u.title}`;
        if (u.id === activeUnit) opt.selected = true;
        unitSelect.appendChild(opt);
      });
    }

    semSelect.onchange = function () {
      updateSubjectsDropdown(this.value);
    };

    subSelect.onchange = function () {
      updateUnitsDropdown(this.value);
    };

    updateSubjectsDropdown(activeSem, selectedSubId || currentSubjectId);
  }

  function openEditorModal(id) {
    currentEditingId = id;
    const modal = document.getElementById('editor-modal');
    const modalTitle = document.getElementById('editor-modal-title');
    const form = document.getElementById('question-form');
    if (!modal || !form) return;

    form.reset();

    if (id) {
      // Edit mode
      const q = window.PracticalsStorage.getQuestionById(id);
      if (!q) {
        showToast('Question not found.', 'error');
        return;
      }

      populateEditorDropdowns(q.semesterId || currentSemesterId, q.subjectId || currentSubjectId, q.unitId);
      if (modalTitle) modalTitle.textContent = `Edit Program: ${q.tag || ''} - ${q.title}`;

      document.getElementById('field-practical-num').value = q.practicalNumber || '';
      document.getElementById('field-tag').value = q.tag || '';
      document.getElementById('field-title').value = q.title || '';
      document.getElementById('field-category').value = q.category || '';
      document.getElementById('field-logic').value = q.logic || '';
      document.getElementById('field-code').value = q.code || '';
      document.getElementById('field-output').value = q.output || '';
      document.getElementById('field-chart-src').value = q.chartSrc || '';
      document.getElementById('field-chart-alt').value = q.chartAlt || '';
    } else {
      // Add mode
      if (modalTitle) modalTitle.textContent = 'Add New Practical Program';
      populateEditorDropdowns(currentSemesterId, currentSubjectId, null);

      const questions = window.PracticalsStorage.loadQuestions(currentSubjectId, currentSemesterId);
      const nextNum = questions.length + 1;
      document.getElementById('field-practical-num').value = nextNum;
      document.getElementById('field-tag').value = `Q${nextNum}`;
    }

    modal.classList.add('active');
  }

  function bindEditorEvents() {
    const form = document.getElementById('question-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const semesterId = document.getElementById('field-semester').value;
        const subjectId = document.getElementById('field-subject').value;
        const unitId = document.getElementById('field-unit').value;
        const practicalNumber = parseInt(document.getElementById('field-practical-num').value, 10);
        const tag = document.getElementById('field-tag').value.trim();
        const title = document.getElementById('field-title').value.trim();
        const category = document.getElementById('field-category').value.trim();
        const logic = document.getElementById('field-logic').value.trim();
        const code = document.getElementById('field-code').value.trim();
        const output = document.getElementById('field-output').value.trim();
        const chartSrc = document.getElementById('field-chart-src').value.trim();
        const chartAlt = document.getElementById('field-chart-alt').value.trim();

        if (!title) {
          showToast('Validation Error: Question title cannot be empty.', 'error');
          document.getElementById('field-title').focus();
          return;
        }

        if (!subjectId) {
          showToast('Validation Error: Please select or add a subject first.', 'error');
          return;
        }

        if (isNaN(practicalNumber) || practicalNumber <= 0) {
          showToast('Validation Error: Practical number must be a positive integer.', 'error');
          document.getElementById('field-practical-num').focus();
          return;
        }

        const payload = {
          semesterId,
          subjectId,
          unitId,
          practicalNumber,
          tag: tag || `Q${practicalNumber}`,
          title,
          question: title,
          category: category || 'General',
          logic,
          code,
          output,
          chartSrc,
          chartAlt
        };

        if (currentEditingId) {
          const updated = window.PracticalsStorage.updateQuestion(currentEditingId, payload);
          if (updated) {
            showToast(`Program ${updated.tag} updated successfully!`, 'success');
          } else {
            showToast('Failed to update question.', 'error');
          }
        } else {
          const added = window.PracticalsStorage.addQuestion(payload);
          if (added) {
            showToast(`Program ${added.tag} added successfully!`, 'success');
          } else {
            showToast('Failed to add question.', 'error');
          }
        }

        closeModal('editor-modal');
        renderSubjectPills();
        renderDashboard();
      });

      const clearBtn = document.getElementById('editor-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          form.reset();
        });
      }
    }

    const codeTextarea = document.getElementById('field-code');
    if (codeTextarea) {
      codeTextarea.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = this.selectionStart;
          const end = this.selectionEnd;
          this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
          this.selectionStart = this.selectionEnd = start + 4;
        }
      });
    }

    const numInput = document.getElementById('field-practical-num');
    const tagInput = document.getElementById('field-tag');
    if (numInput && tagInput) {
      numInput.addEventListener('input', function () {
        if (!currentEditingId) {
          const val = parseInt(this.value, 10);
          if (!isNaN(val)) tagInput.value = `Q${val}`;
        }
      });
    }

    // Quick Add Subject button inside question form
    const quickAddSubBtn = document.getElementById('quick-add-sub-btn');
    if (quickAddSubBtn) {
      quickAddSubBtn.addEventListener('click', function () {
        openSubjectEditorModal(null);
      });
    }
  }

  /* ==========================================================================
     SUBJECT MANAGEMENT (Add, Edit, Delete Subject)
     ========================================================================== */

  function renderSubjectsTable() {
    if (!window.PracticalsStorage) return;

    const subjects = window.PracticalsStorage.loadSubjects(currentSemesterId);
    const questions = window.PracticalsStorage.loadQuestions();
    const semObj = window.PracticalsStorage.getSemesterById(currentSemesterId);
    const tbody = document.getElementById('dashboard-subjects-table-body');
    const subDesc = document.getElementById('subjects-section-sub');

    if (subDesc && semObj) {
      subDesc.textContent = `Manage all course subjects registered in ${semObj.name} (${semObj.title}).`;
    }

    if (!tbody) return;

    if (subjects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 28px 16px; color: var(--text-dim); font-family: var(--mono);">
            No subjects found in this semester. Click "+ Add New Subject" to create one.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    subjects.forEach(sub => {
      const qCount = questions.filter(q => q.subjectId === sub.id).length;
      html += `
        <tr data-sub-id="${escapeHtml(sub.id)}" style="${sub.id === currentSubjectId ? 'background: rgba(55,118,171,0.12);' : ''}">
          <td>
            <div style="font-size: 20px; line-height: 1;">${sub.icon || '📚'}</div>
            <span class="sub-code" style="font-size: 11px; margin-top: 4px; display: inline-block;">${escapeHtml(sub.code)}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text); font-size: 14.5px;">${escapeHtml(sub.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">${escapeHtml(sub.desc || '')}</div>
          </td>
          <td>
            <span class="unit-badge" style="font-size: 11.5px;">${escapeHtml(semObj ? semObj.name : sub.semesterId)}</span>
          </td>
          <td style="text-align: center;">
            <span class="category-badge" style="font-weight: 700; font-size: 12px;">${qCount} practicals</span>
          </td>
          <td>
            <div class="table-actions" style="justify-content: flex-end;">
              <button type="button" class="clay-btn select-sub-workspace-btn" data-sub-id="${escapeHtml(sub.id)}" style="padding: 5px 12px; font-size: 11.5px; min-height: 32px;">
                ${sub.id === currentSubjectId ? 'Active' : 'Open'}
              </button>
              <button type="button" class="action-btn edit-sub-row-btn" data-sub-id="${escapeHtml(sub.id)}" title="Edit Subject">
                ✏️ Edit
              </button>
              <button type="button" class="action-btn del delete-sub-row-btn" data-sub-id="${escapeHtml(sub.id)}" title="Delete Subject">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function openSubjectEditorModal(subjectId = null) {
    currentEditingSubjectId = subjectId;
    const modal = document.getElementById('subject-editor-modal');
    const titleEl = document.getElementById('subject-editor-title');
    const form = document.getElementById('subject-form');
    const deleteBtn = document.getElementById('delete-subject-btn');
    const semSelect = document.getElementById('field-sub-sem');

    if (!modal || !form || !window.PracticalsStorage) return;
    form.reset();

    // Populate semester dropdown in subject modal
    const semesters = window.PracticalsStorage.loadSemesters();
    if (semSelect) {
      semSelect.innerHTML = '';
      semesters.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.title})`;
        if (s.id === currentSemesterId) opt.selected = true;
        semSelect.appendChild(opt);
      });
    }

    if (subjectId) {
      const sub = window.PracticalsStorage.getSubjectById(subjectId);
      if (!sub) return;
      if (titleEl) titleEl.textContent = `Edit Subject: ${sub.name}`;
      document.getElementById('field-sub-name').value = sub.name || '';
      document.getElementById('field-sub-code').value = sub.code || '';
      document.getElementById('field-sub-icon').value = sub.icon || '📚';
      document.getElementById('field-sub-desc').value = sub.desc || '';
      if (semSelect) semSelect.value = sub.semesterId || currentSemesterId;
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    } else {
      if (titleEl) titleEl.textContent = 'Add New Course Subject';
      document.getElementById('field-sub-icon').value = '📚';
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
  }

  function openDeleteSubjectModal(subjectId) {
    currentDeletingSubjectId = subjectId;
    const sub = window.PracticalsStorage.getSubjectById(subjectId);
    if (!sub) return;

    const modal = document.getElementById('delete-subject-modal');
    const nameEl = document.getElementById('delete-subject-target-name');
    if (!modal) return;

    if (nameEl) nameEl.textContent = `"${sub.name}" (${sub.code})`;
    modal.classList.add('active');
  }

  function bindSubjectEvents() {
    // Subject Form Submit (Add or Edit)
    const form = document.getElementById('subject-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('field-sub-name').value.trim();
        const code = document.getElementById('field-sub-code').value.trim();
        const semesterId = document.getElementById('field-sub-sem').value;
        const icon = document.getElementById('field-sub-icon').value.trim() || '📚';
        const desc = document.getElementById('field-sub-desc').value.trim();

        if (!name) {
          showToast('Validation Error: Subject name cannot be empty.', 'error');
          document.getElementById('field-sub-name').focus();
          return;
        }

        const payload = { name, code, semesterId, icon, desc };

        if (currentEditingSubjectId) {
          const updated = window.PracticalsStorage.updateSubject(currentEditingSubjectId, payload);
          if (updated) {
            showToast(`Subject ${updated.name} updated successfully!`, 'success');
            currentSubjectId = updated.id;
          } else {
            showToast('Failed to update subject.', 'error');
          }
        } else {
          const added = window.PracticalsStorage.addSubject(payload);
          if (added) {
            showToast(`Subject ${added.name} added successfully!`, 'success');
            currentSemesterId = added.semesterId;
            currentSubjectId = added.id;
          } else {
            showToast('Failed to add subject.', 'error');
          }
        }

        closeModal('subject-editor-modal');
        renderSemesterPills();
        renderSubjectPills();
        renderDashboard();
      });
    }

    // Delete button in subject editor modal
    const delBtnInModal = document.getElementById('delete-subject-btn');
    if (delBtnInModal) {
      delBtnInModal.addEventListener('click', function () {
        if (currentEditingSubjectId) {
          closeModal('subject-editor-modal');
          openDeleteSubjectModal(currentEditingSubjectId);
        }
      });
    }

    // Delegated actions in subjects table
    const subTableBody = document.getElementById('dashboard-subjects-table-body');
    if (subTableBody) {
      subTableBody.addEventListener('click', function (e) {
        const selectBtn = e.target.closest('.select-sub-workspace-btn');
        if (selectBtn) {
          const subId = selectBtn.getAttribute('data-sub-id');
          setWorkspaceSubject(subId);
          // Switch to Questions Tab
          const tabQuestionsBtn = document.getElementById('tab-questions-btn');
          if (tabQuestionsBtn) tabQuestionsBtn.click();
          return;
        }

        const editBtn = e.target.closest('.edit-sub-row-btn');
        if (editBtn) {
          const subId = editBtn.getAttribute('data-sub-id');
          openSubjectEditorModal(subId);
          return;
        }

        const delBtn = e.target.closest('.delete-sub-row-btn');
        if (delBtn) {
          const subId = delBtn.getAttribute('data-sub-id');
          openDeleteSubjectModal(subId);
          return;
        }
      });
    }

    // Confirm Delete Subject Button
    const confirmDelSubBtn = document.getElementById('confirm-delete-subject-btn');
    if (confirmDelSubBtn) {
      confirmDelSubBtn.addEventListener('click', function () {
        if (currentDeletingSubjectId) {
          const deleteQuestions = document.getElementById('delete-subject-questions-checkbox').checked;
          const success = window.PracticalsStorage.deleteSubject(currentDeletingSubjectId, deleteQuestions);
          if (success) {
            showToast('Subject deleted successfully.', 'info');
            initWorkspaceState();
            renderSubjectPills();
            renderDashboard();
          } else {
            showToast('Failed to delete subject.', 'error');
          }
          currentDeletingSubjectId = null;
        }
        closeModal('delete-subject-modal');
      });
    }
  }

  /* ==========================================================================
     SEMESTER MANAGEMENT (Add Semester Modal)
     ========================================================================== */

  function openSemesterEditorModal() {
    const modal = document.getElementById('semester-editor-modal');
    const form = document.getElementById('semester-form');
    if (!modal || !form) return;
    form.reset();

    const semesters = window.PracticalsStorage.loadSemesters();
    const nextNum = semesters.length + 1;
    document.getElementById('field-sem-name').value = `Sem ${nextNum}`;
    document.getElementById('field-sem-title').value = `Semester ${nextNum}`;

    modal.classList.add('active');
  }

  function bindSemesterEvents() {
    const form = document.getElementById('semester-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('field-sem-name').value.trim();
        const title = document.getElementById('field-sem-title').value.trim();
        const desc = document.getElementById('field-sem-desc').value.trim();

        if (!name) {
          showToast('Validation Error: Semester name cannot be empty.', 'error');
          document.getElementById('field-sem-name').focus();
          return;
        }

        const added = window.PracticalsStorage.addSemester({ name, title, desc });
        if (added) {
          showToast(`Semester ${added.name} created successfully!`, 'success');
          setWorkspaceSemester(added.id);
        } else {
          showToast('Failed to create semester.', 'error');
        }

        closeModal('semester-editor-modal');
        renderSemesterPills();
      });
    }
  }

  /* ==========================================================================
     UNIT MANAGEMENT (Add, Edit, Delete Units)
     ========================================================================== */

  function renderUnitsTable() {
    if (!window.PracticalsStorage) return;

    const units = window.PracticalsStorage.loadUnits(currentSubjectId, currentSemesterId);
    const questions = window.PracticalsStorage.loadQuestions(currentSubjectId, currentSemesterId);
    const subObj = window.PracticalsStorage.getSubjectById(currentSubjectId);

    const tbodyModal = document.getElementById('units-table-body');
    const tbodyDash = document.getElementById('dashboard-units-table-body');
    const unitsSubTitle = document.getElementById('units-section-sub');
    const unitsModalSub = document.getElementById('units-modal-sub');

    if (unitsSubTitle && subObj) {
      unitsSubTitle.textContent = `Managing syllabus units for ${subObj.name} (${subObj.code}).`;
    }
    if (unitsModalSub && subObj) {
      unitsModalSub.textContent = `Add, edit, or delete syllabus units for ${subObj.name}.`;
    }

    if (units.length === 0) {
      const emptyRow = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 28px 16px; color: var(--text-dim); font-family: var(--mono);">
            No syllabus units found for this subject. Click "+ Add New Unit" to create one.
          </td>
        </tr>
      `;
      if (tbodyModal) tbodyModal.innerHTML = emptyRow;
      if (tbodyDash) tbodyDash.innerHTML = emptyRow;
      return;
    }

    let html = '';
    units.forEach(u => {
      const qCount = questions.filter(q => q.unitId === u.id).length;
      html += `
        <tr data-unit-id="${escapeHtml(u.id)}">
          <td>
            <span class="unit-badge" style="font-size: 12px; padding: 4px 8px;">${escapeHtml(u.num)}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text); font-size: 14px;">${escapeHtml(u.title)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">${escapeHtml(u.sub || '')}</div>
          </td>
          <td style="text-align: center;">
            <span class="category-badge" style="font-weight: 600; font-size: 12px;">${qCount} practicals</span>
          </td>
          <td>
            <div class="table-actions" style="justify-content: flex-end;">
              <button type="button" class="action-btn edit-unit-btn" data-unit-id="${escapeHtml(u.id)}" title="Edit unit">
                ✏️ Edit
              </button>
              <button type="button" class="action-btn del delete-unit-btn" data-unit-id="${escapeHtml(u.id)}" title="Delete unit">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    if (tbodyModal) tbodyModal.innerHTML = html;
    if (tbodyDash) tbodyDash.innerHTML = html;
  }

  function openUnitEditorModal(unitId = null) {
    currentEditingUnitId = unitId;
    const modal = document.getElementById('unit-editor-modal');
    const titleEl = document.getElementById('unit-editor-title');
    const form = document.getElementById('unit-form');
    const subSelect = document.getElementById('field-unit-subject');

    if (!modal || !form || !window.PracticalsStorage) return;
    form.reset();

    // Populate subject select in unit editor
    const subjects = window.PracticalsStorage.loadSubjects();
    if (subSelect) {
      subSelect.innerHTML = '';
      subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.code})`;
        if (s.id === currentSubjectId) opt.selected = true;
        subSelect.appendChild(opt);
      });
    }

    if (unitId) {
      const u = window.PracticalsStorage.getUnitById(unitId);
      if (!u) {
        showToast('Unit not found.', 'error');
        return;
      }
      if (titleEl) titleEl.textContent = `Edit Syllabus Unit: ${u.num}`;
      document.getElementById('field-unit-num').value = u.num || '';
      document.getElementById('field-unit-title').value = u.title || '';
      document.getElementById('field-unit-sub').value = u.sub || '';
      if (subSelect && u.subjectId) subSelect.value = u.subjectId;
    } else {
      const units = window.PracticalsStorage.loadUnits(currentSubjectId);
      if (titleEl) titleEl.textContent = 'Add New Syllabus Unit';
      document.getElementById('field-unit-num').value = `Unit ${units.length + 1}`;
      document.getElementById('field-unit-title').value = '';
      document.getElementById('field-unit-sub').value = 'solved programs — aim, logic, code and output';
    }

    modal.classList.add('active');
  }

  function openDeleteUnitModal(unitId) {
    currentDeletingUnitId = unitId;
    const u = window.PracticalsStorage.getUnitById(unitId);
    if (!u) return;

    const questions = window.PracticalsStorage.loadQuestions(currentSubjectId);
    const qCount = questions.filter(q => q.unitId === unitId).length;

    const modal = document.getElementById('delete-unit-modal');
    const nameEl = document.getElementById('delete-unit-target-name');
    const countEl = document.getElementById('delete-unit-questions-count');
    if (!modal) return;

    if (nameEl) nameEl.textContent = `${u.num} — "${u.title}"`;
    if (countEl) countEl.textContent = qCount;

    modal.classList.add('active');
  }

  function bindUnitEvents() {
    const createBtn = document.getElementById('create-unit-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        openUnitEditorModal(null);
      });
    }

    const addUnitDirectBtn = document.getElementById('add-unit-direct-btn');
    if (addUnitDirectBtn) {
      addUnitDirectBtn.addEventListener('click', function () {
        openUnitEditorModal(null);
      });
    }

    const addUnitSecBtn = document.getElementById('add-unit-section-btn');
    if (addUnitSecBtn) {
      addUnitSecBtn.addEventListener('click', function () {
        openUnitEditorModal(null);
      });
    }

    const quickAddBtn = document.getElementById('quick-add-unit-btn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', function () {
        openUnitEditorModal(null);
      });
    }

    const quickEditBtn = document.getElementById('quick-edit-unit-btn');
    if (quickEditBtn) {
      quickEditBtn.addEventListener('click', function () {
        const fieldUnit = document.getElementById('field-unit');
        const selectedUnitId = fieldUnit ? fieldUnit.value : null;
        if (selectedUnitId) {
          openUnitEditorModal(selectedUnitId);
        } else {
          showToast('Please select a unit to edit.', 'info');
        }
      });
    }

    function handleUnitTableClicks(e) {
      const editBtn = e.target.closest('.edit-unit-btn');
      if (editBtn) {
        const unitId = editBtn.getAttribute('data-unit-id');
        openUnitEditorModal(unitId);
        return;
      }

      const delBtn = e.target.closest('.delete-unit-btn');
      if (delBtn) {
        const unitId = delBtn.getAttribute('data-unit-id');
        openDeleteUnitModal(unitId);
        return;
      }
    }

    const unitsTbody = document.getElementById('units-table-body');
    if (unitsTbody) unitsTbody.addEventListener('click', handleUnitTableClicks);

    const dashUnitsTbody = document.getElementById('dashboard-units-table-body');
    if (dashUnitsTbody) dashUnitsTbody.addEventListener('click', handleUnitTableClicks);

    const unitForm = document.getElementById('unit-form');
    if (unitForm) {
      unitForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const num = document.getElementById('field-unit-num').value.trim();
        const title = document.getElementById('field-unit-title').value.trim();
        const sub = document.getElementById('field-unit-sub').value.trim();
        const subjectId = document.getElementById('field-unit-subject').value || currentSubjectId;

        if (!num || !title) {
          showToast('Validation Error: Unit identifier and title are required.', 'error');
          return;
        }

        const payload = { num, title, sub, subjectId };

        if (currentEditingUnitId) {
          const updated = window.PracticalsStorage.updateUnit(currentEditingUnitId, payload);
          if (updated) {
            showToast(`Unit ${updated.num} updated successfully!`, 'success');
          }
        } else {
          const added = window.PracticalsStorage.addUnit(payload);
          if (added) {
            showToast(`Unit ${added.num} added successfully!`, 'success');
          }
        }

        closeModal('unit-editor-modal');
        renderUnitsTable();
        renderDashboard();
      });
    }

    const confirmDelUnitBtn = document.getElementById('confirm-delete-unit-btn');
    if (confirmDelUnitBtn) {
      confirmDelUnitBtn.addEventListener('click', function () {
        if (currentDeletingUnitId) {
          const shouldDeleteQuestions = document.getElementById('delete-unit-questions-checkbox').checked;
          const res = window.PracticalsStorage.deleteUnit(currentDeletingUnitId, shouldDeleteQuestions);
          if (res.success) {
            showToast(`Unit deleted successfully. (${res.deletedQuestionsCount} questions removed)`, 'info');
            renderUnitsTable();
            renderDashboard();
          }
          currentDeletingUnitId = null;
        }
        closeModal('delete-unit-modal');
      });
    }
  }

  /* ==========================================================================
     STUDENT CARD PREVIEW & QUESTION DELETE MODAL
     ========================================================================== */

  function openPreviewModal(id) {
    const q = window.PracticalsStorage.getQuestionById(id);
    if (!q) {
      showToast('Question not found.', 'error');
      return;
    }

    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-content-box');
    if (!modal || !container) return;

    const codeHighlighted = q.codeHtml || window.PracticalsStorage.highlightCode(q.code);
    const chartHtml = q.chartSrc ? `<img class="chart" src="${escapeHtml(q.chartSrc)}" alt="${escapeHtml(q.chartAlt || q.title)}">` : '';

    container.innerHTML = `
      <div class="q open" style="border: 1px solid var(--border); border-radius: 14px; padding: 6px 14px; background: rgba(255,255,255,0.02);">
        <button class="q-btn" aria-expanded="true" style="cursor: default;">
          <span class="tag">${escapeHtml(q.tag || 'Q')}</span>
          <span class="ttl">${escapeHtml(q.title)}</span>
          <span class="car" style="transform: rotate(90deg);">&#8250;</span>
        </button>
        <div class="q-panel" style="max-height: none;">
          <div class="q-body" style="padding-bottom: 14px;">
            <div class="q-label">Logic</div>
            <p class="q-logic">${q.logic}</p>
            <div class="q-label">Program</div>
            <div class="code-wrap">
              <pre class="code"><code>${codeHighlighted}</code></pre>
            </div>
            <div class="q-label">Output</div>
            <div class="out">${escapeHtml(q.output)}</div>
            ${chartHtml}
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  function openDeleteConfirmModal(id) {
    currentDeletingId = id;
    const q = window.PracticalsStorage.getQuestionById(id);
    if (!q) return;

    const modal = document.getElementById('delete-modal');
    const nameEl = document.getElementById('delete-item-name');
    if (!modal) return;

    if (nameEl) nameEl.textContent = `${q.tag || ''}: "${q.title}"`;
    modal.classList.add('active');
  }

  function bindModalEvents() {
    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    if (confirmDelBtn) {
      confirmDelBtn.addEventListener('click', function () {
        if (currentDeletingId) {
          const success = window.PracticalsStorage.deleteQuestion(currentDeletingId);
          if (success) {
            showToast('Program deleted successfully.', 'info');
            renderDashboard();
          }
          currentDeletingId = null;
        }
        closeModal('delete-modal');
      });
    }

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', function () {
        const modalId = this.getAttribute('data-modal-close');
        closeModal(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('active');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, duration);
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
