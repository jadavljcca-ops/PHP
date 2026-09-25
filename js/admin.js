/**
 * admin.js - Admin Dashboard Management Logic
 * Handles client-side auth, CRUD operations on questions, live search/filtering,
 * question editor modal, student card preview, JSON import/export, and notifications.
 */

(function () {
  'use strict';

  // State
  let currentEditingId = null;
  let currentDeletingId = null;
  let currentEditingUnitId = null;
  let currentDeletingUnitId = null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  function initAdmin() {
    initTheme();
    checkAuthState();
    bindAuthEvents();
    bindDashboardEvents();
    bindEditorEvents();
    bindUnitEvents();
    bindModalEvents();
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

    // Bind all theme toggle buttons (both login and dashboard)
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

    // Update all theme toggle buttons on page
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

      renderDashboard();
    } else {
      if (loginView) loginView.style.display = 'flex';
      if (dashboardView) dashboardView.style.display = 'none';
    }
  }

  function bindAuthEvents() {
    // Login form
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

    // Logout button
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
     DASHBOARD RENDERING
     ========================================================================== */

  function renderDashboard() {
    if (!window.PracticalsStorage) return;

    const questions = window.PracticalsStorage.loadQuestions();
    const units = window.PracticalsStorage.loadUnits();

    // 1. Update Stats & Tab badges
    const totalQEl = document.getElementById('stat-total-questions');
    const totalUnitsEl = document.getElementById('stat-total-units');
    const totalCatsEl = document.getElementById('stat-total-categories');
    const tabQEl = document.getElementById('tab-questions-count');
    const tabUnitsEl = document.getElementById('tab-units-count');

    if (totalQEl) totalQEl.textContent = questions.length;
    if (totalUnitsEl) totalUnitsEl.textContent = units.length;
    if (tabQEl) tabQEl.textContent = questions.length;
    if (tabUnitsEl) tabUnitsEl.textContent = units.length;

    const categories = new Set();
    questions.forEach(q => {
      if (q.category) categories.add(q.category.trim());
    });
    if (totalCatsEl) totalCatsEl.textContent = categories.size;

    // 2. Populate Category Filter Dropdown
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

    // 3. Populate Unit Filter Dropdown
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

    // 4. Render Tables
    filterAndRenderTable();
    renderUnitsTable();
  }

  function filterAndRenderTable() {
    const searchInput = document.getElementById('admin-search-input');
    const unitSelect = document.getElementById('filter-unit');
    const catSelect = document.getElementById('filter-category');

    const query = searchInput ? searchInput.value : '';
    const unitId = unitSelect ? unitSelect.value : 'all';
    const category = catSelect ? catSelect.value : 'all';

    const filtered = window.PracticalsStorage.searchQuestions(query, unitId, category);

    // Update count indicator
    const countIndicator = document.getElementById('filtered-count-display');
    const totalQuestions = window.PracticalsStorage.loadQuestions().length;
    if (countIndicator) {
      countIndicator.textContent = `Showing ${filtered.length} of ${totalQuestions} programs`;
    }

    // Render Table Rows
    const tbody = document.getElementById('questions-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px 16px; color: var(--text-dim); font-family: var(--mono);">
            No matching practical questions found. Try clearing your filters or add a new question.
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
    if (searchInput) {
      searchInput.addEventListener('input', filterAndRenderTable);
    }

    // Unit filter
    const unitSelect = document.getElementById('filter-unit');
    if (unitSelect) {
      unitSelect.addEventListener('change', filterAndRenderTable);
    }

    // Category filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', filterAndRenderTable);
    }

    // Table action buttons delegation
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

    // Tabs Switching (Questions vs Units)
    const tabQuestionsBtn = document.getElementById('tab-questions-btn');
    const tabUnitsBtn = document.getElementById('tab-units-btn');
    const secQuestions = document.getElementById('section-questions');
    const secUnits = document.getElementById('section-units');

    function switchDashboardTab(target) {
      if (target === 'units') {
        if (tabQuestionsBtn) tabQuestionsBtn.classList.remove('active');
        if (tabUnitsBtn) tabUnitsBtn.classList.add('active');
        if (secQuestions) secQuestions.style.display = 'none';
        if (secUnits) secUnits.style.display = 'block';
        renderUnitsTable();
      } else {
        if (tabUnitsBtn) tabUnitsBtn.classList.remove('active');
        if (tabQuestionsBtn) tabQuestionsBtn.classList.add('active');
        if (secUnits) secUnits.style.display = 'none';
        if (secQuestions) secQuestions.style.display = 'block';
        filterAndRenderTable();
      }
    }

    if (tabQuestionsBtn) tabQuestionsBtn.addEventListener('click', () => switchDashboardTab('questions'));
    if (tabUnitsBtn) tabUnitsBtn.addEventListener('click', () => switchDashboardTab('units'));

    // Manage Units button switches to Units Tab and scrolls
    const manageUnitsBtn = document.getElementById('manage-units-btn');
    if (manageUnitsBtn) {
      manageUnitsBtn.addEventListener('click', function () {
        switchDashboardTab('units');
        if (secUnits) secUnits.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Direct Add Unit Buttons
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
        showToast('Generating PDF lab manual, please wait...', 'info', 1800);
        setTimeout(function () {
          const success = window.PracticalsStorage.exportQuestionsPDF();
          if (success) {
            showToast('Downloaded python-practicals-lab-manual.pdf successfully!', 'success');
          }
        }, 150);
      });
    }

    // Open Credentials Modal Button
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

    // Credentials Form Submit
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

    // Credentials Reset to Default Button
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
        window.PracticalsStorage.exportQuestionsJSON();
        showToast('Exported backup data as python-practicals-data.json', 'success');
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
        if (confirm('Are you sure you want to reset all practical questions back to the default 62 programs? Any unexported browser modifications will be replaced.')) {
          window.PracticalsStorage.resetToDefaults();
          showToast('Questions reset to default 62 programs.', 'info');
          renderDashboard();
        }
      });
    }
  }

  /* ==========================================================================
     QUESTION EDITOR MODAL
     ========================================================================== */

  // Helper to populate unit select in question editor
  function populateUnitSelector(selectedId = null) {
    const unitSelect = document.getElementById('field-unit');
    if (!unitSelect || !window.PracticalsStorage) return;
    const units = window.PracticalsStorage.loadUnits();
    const currentVal = selectedId || unitSelect.value || (units[0] ? units[0].id : '');
    unitSelect.innerHTML = '';
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.num} — ${u.title}`;
      if (u.id === currentVal) opt.selected = true;
      unitSelect.appendChild(opt);
    });
    if (currentVal) unitSelect.value = currentVal;
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

      populateUnitSelector(q.unitId || 'unit-1');
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
      // Suggest practical number
      const questions = window.PracticalsStorage.loadQuestions();
      const unit1Questions = questions.filter(q => q.unitId === 'unit-1');
      document.getElementById('field-practical-num').value = unit1Questions.length + 1;
      document.getElementById('field-tag').value = `Q${unit1Questions.length + 1}`;
    }

    modal.classList.add('active');
  }

  function bindEditorEvents() {
    const form = document.getElementById('question-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

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

        // Validation
        if (!title) {
          showToast('Validation Error: Question title cannot be empty.', 'error');
          document.getElementById('field-title').focus();
          return;
        }

        if (!logic) {
          showToast('Validation Error: Logic / Explanation cannot be empty.', 'error');
          document.getElementById('field-logic').focus();
          return;
        }

        if (isNaN(practicalNumber) || practicalNumber <= 0) {
          showToast('Validation Error: Practical number must be a positive integer.', 'error');
          document.getElementById('field-practical-num').focus();
          return;
        }

        const payload = {
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
          // Update
          const updated = window.PracticalsStorage.updateQuestion(currentEditingId, payload);
          if (updated) {
            showToast(`Program ${updated.tag} updated successfully!`, 'success');
          } else {
            showToast('Failed to update question.', 'error');
          }
        } else {
          // Add
          const added = window.PracticalsStorage.addQuestion(payload);
          if (added) {
            showToast(`Program ${added.tag} added successfully!`, 'success');
          } else {
            showToast('Failed to add question.', 'error');
          }
        }

        closeModal('editor-modal');
        renderDashboard();
      });

      // Clear button
      const clearBtn = document.getElementById('editor-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          form.reset();
        });
      }
    }

    // Support Tab key indentation inside Python Code textarea
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

    // Auto-update Tag when practical number changes in Add mode
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
  }

  /* ==========================================================================
     STUDENT CARD PREVIEW MODAL
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

    const codeHighlighted = q.codeHtml || window.PracticalsStorage.highlightPython(q.code);
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

  /* ==========================================================================
     DELETE CONFIRMATION MODAL
     ========================================================================== */

  function openDeleteConfirmModal(id) {
    currentDeletingId = id;
    const q = window.PracticalsStorage.getQuestionById(id);
    if (!q) return;

    const modal = document.getElementById('delete-modal');
    const nameEl = document.getElementById('delete-item-name');
    if (!modal) return;

    if (nameEl) {
      nameEl.textContent = `${q.tag || ''}: "${q.title}"`;
    }

    modal.classList.add('active');
  }

  /* ==========================================================================
     UNIT MANAGEMENT (Add, Edit, Delete Units)
     ========================================================================== */

  function renderUnitsTable() {
    if (!window.PracticalsStorage) return;

    const units = window.PracticalsStorage.loadUnits();
    const questions = window.PracticalsStorage.loadQuestions();

    const tbodyModal = document.getElementById('units-table-body');
    const tbodyDash = document.getElementById('dashboard-units-table-body');

    if (units.length === 0) {
      const emptyRow = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 28px 16px; color: var(--text-dim); font-family: var(--mono);">
            No syllabus units found. Click "+ Add New Unit" to create one.
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
            <span class="category-badge" style="font-weight: 600; font-size: 12px;">${qCount} programs</span>
          </td>
          <td>
            <div class="table-actions" style="justify-content: flex-end;">
              <button type="button" class="action-btn edit-unit-btn" data-unit-id="${escapeHtml(u.id)}" title="Edit unit identifier, title, or subtitle">
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

  function openUnitsModal() {
    renderUnitsTable();
    const modal = document.getElementById('units-modal');
    if (modal) modal.classList.add('active');
  }

  function openUnitEditorModal(unitId = null) {
    currentEditingUnitId = unitId;
    const modal = document.getElementById('unit-editor-modal');
    const titleEl = document.getElementById('unit-editor-title');
    const form = document.getElementById('unit-form');
    if (!modal || !form) return;

    form.reset();

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
    } else {
      const units = window.PracticalsStorage.loadUnits();
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

    const questions = window.PracticalsStorage.loadQuestions();
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
    // Open Unit Editor (Add mode) from modal button
    const createBtn = document.getElementById('create-unit-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        openUnitEditorModal(null);
      });
    }

    // Quick Unit buttons in Question Editor form
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

    // Handle delegated edit and delete on both unit tables (dashboard and modal)
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
    if (unitsTbody) {
      unitsTbody.addEventListener('click', handleUnitTableClicks);
    }

    const dashUnitsTbody = document.getElementById('dashboard-units-table-body');
    if (dashUnitsTbody) {
      dashUnitsTbody.addEventListener('click', handleUnitTableClicks);
    }

    // Unit Form Submit (Add or Edit Unit)
    const unitForm = document.getElementById('unit-form');
    if (unitForm) {
      unitForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const num = document.getElementById('field-unit-num').value.trim();
        const title = document.getElementById('field-unit-title').value.trim();
        const sub = document.getElementById('field-unit-sub').value.trim();

        if (!num) {
          showToast('Validation Error: Unit identifier cannot be empty.', 'error');
          document.getElementById('field-unit-num').focus();
          return;
        }
        if (!title) {
          showToast('Validation Error: Unit title cannot be empty.', 'error');
          document.getElementById('field-unit-title').focus();
          return;
        }

        const payload = { num, title, sub };
        let activeUnitId = null;

        if (currentEditingUnitId) {
          const updated = window.PracticalsStorage.updateUnit(currentEditingUnitId, payload);
          if (updated) {
            showToast(`Unit ${updated.num} updated successfully!`, 'success');
            activeUnitId = updated.id;
          } else {
            showToast('Failed to update unit.', 'error');
          }
        } else {
          const added = window.PracticalsStorage.addUnit(payload);
          if (added) {
            showToast(`Unit ${added.num} added successfully!`, 'success');
            activeUnitId = added.id;
          } else {
            showToast('Failed to add unit.', 'error');
          }
        }

        closeModal('unit-editor-modal');
        renderUnitsTable();
        renderDashboard();
        populateUnitSelector(activeUnitId);
      });
    }

    // Confirm Delete Unit Button
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
          } else {
            showToast('Failed to delete unit.', 'error');
          }
          currentDeletingUnitId = null;
        }
        closeModal('delete-unit-modal');
      });
    }
  }

  function bindModalEvents() {
    // Delete confirm button
    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    if (confirmDelBtn) {
      confirmDelBtn.addEventListener('click', function () {
        if (currentDeletingId) {
          const success = window.PracticalsStorage.deleteQuestion(currentDeletingId);
          if (success) {
            showToast('Program deleted successfully.', 'info');
            renderDashboard();
          } else {
            showToast('Failed to delete program.', 'error');
          }
          currentDeletingId = null;
        }
        closeModal('delete-modal');
      });
    }

    // Close buttons on all modals
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', function () {
        const modalId = this.getAttribute('data-modal-close');
        closeModal(modalId);
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.remove('active');
        }
      });
    });

    // Close on Escape key
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

  /* ==========================================================================
     TOAST NOTIFICATION HELPER
     ========================================================================== */

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
