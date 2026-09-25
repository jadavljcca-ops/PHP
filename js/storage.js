/**
 * storage.js - Data Layer for Multi-Semester, Multi-Subject Practicals Lab Manual
 * Supports Sem 1, Sem 3, Sem 5 (and dynamic new semesters),
 * dynamic Subjects (Add, Edit, Delete), Units, and Practicals CRUD,
 * with real PDF export, JSON backup/restore, and localStorage persistence.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_SEMESTERS = 'python_practicals_semesters_v2';
  const STORAGE_KEY_SUBJECTS = 'python_practicals_subjects_v2';
  const STORAGE_KEY_UNITS = 'python_practicals_units_v1';
  const STORAGE_KEY_QUESTIONS = 'python_practicals_questions_v1';
  const STORAGE_KEY_ACTIVE_SEM = 'python_practicals_active_sem_v1';
  const STORAGE_KEY_ACTIVE_SUB = 'python_practicals_active_sub_v1';

  // Helper to escape HTML characters
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Universal Syntax Highlighter for Python, C, C++, and general programming
  function highlightCode(code, lang = 'auto') {
    if (!code) return '<span class="line">&nbsp;</span>';

    const lines = code.split(/\r?\n/);
    const keywords = new Set([
      // Python keywords
      'def', 'class', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'try',
      'except', 'finally', 'with', 'as', 'import', 'from', 'lambda', 'pass',
      'break', 'continue', 'global', 'nonlocal', 'raise', 'yield', 'assert',
      'and', 'or', 'not', 'is', 'None', 'True', 'False',
      // C / C++ keywords
      'include', 'int', 'float', 'double', 'char', 'void', 'long', 'short',
      'unsigned', 'signed', 'const', 'static', 'sizeof', 'typedef', 'struct',
      'union', 'enum', 'switch', 'case', 'default', 'goto', 'auto', 'register',
      'extern', 'namespace', 'using', 'public', 'private', 'protected', 'virtual',
      'new', 'delete', 'bool', 'true', 'false', 'nullptr', 'NULL', 'cout', 'cin', 'endl'
    ]);

    const builtins = new Set([
      // Python builtins
      'print', 'input', 'len', 'range', 'list', 'tuple', 'dict', 'set',
      'max', 'min', 'sum', 'abs', 'round', 'sorted', 'reversed', 'map', 'filter',
      'open', 'enumerate', 'zip', 'type', 'isinstance',
      // C / C++ standard library functions
      'printf', 'scanf', 'malloc', 'free', 'calloc', 'realloc', 'strlen', 'strcpy',
      'strcmp', 'strcat', 'main', 'exit', 'pow', 'sqrt', 'push', 'pop', 'enqueue', 'dequeue'
    ]);

    return lines.map(line => {
      let out = '';
      let i = 0;
      const len = line.length;

      while (i < len) {
        // C/C++ Preprocessor directive (#include, #define) or Python comment (#)
        if (line[i] === '#') {
          // If starts with #include or #define
          const rest = line.slice(i);
          if (/^#(include|define|pragma|ifdef|ifndef|endif)/.test(rest)) {
            const match = rest.match(/^#(include|define|pragma|ifdef|ifndef|endif)\s*(<[^>]+>|"[^"]+"|\w+)?/);
            if (match) {
              out += '<span class="tok-kw">#' + escapeHtml(match[1]) + '</span> ' + escapeHtml(match[2] || '');
              i += match[0].length;
              continue;
            }
          }
          // Otherwise Python comment
          const comment = line.slice(i);
          out += '<span class="tok-com">' + escapeHtml(comment) + '</span>';
          break;
        }

        // C / C++ single line comment: //
        if (line[i] === '/' && line[i + 1] === '/') {
          const comment = line.slice(i);
          out += '<span class="tok-com">' + escapeHtml(comment) + '</span>';
          break;
        }

        // Strings: single or double quote
        if (line[i] === '"' || line[i] === "'") {
          const quote = line[i];
          let str = quote;
          i++;
          while (i < len) {
            str += line[i];
            if (line[i] === quote && line[i - 1] !== '\\') {
              i++;
              break;
            }
            i++;
          }
          out += '<span class="tok-str">' + escapeHtml(str) + '</span>';
          continue;
        }

        // Numbers
        if (/\d/.test(line[i])) {
          let num = '';
          while (i < len && /[\d.jJ_]/.test(line[i])) {
            num += line[i];
            i++;
          }
          out += '<span class="tok-num">' + num + '</span>';
          continue;
        }

        // Identifiers, keywords, functions
        if (/[a-zA-Z_@]/.test(line[i])) {
          let word = '';
          let isDecorator = (line[i] === '@');
          if (isDecorator) {
            word += '@';
            i++;
          }
          while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
            word += line[i];
            i++;
          }

          if (isDecorator) {
            out += '<span class="tok-kw">' + escapeHtml(word) + '</span>';
          } else if (keywords.has(word)) {
            out += '<span class="tok-kw">' + escapeHtml(word) + '</span>';
          } else if (builtins.has(word)) {
            out += '<span class="tok-fn">' + escapeHtml(word) + '</span>';
          } else {
            out += escapeHtml(word);
          }
          continue;
        }

        // Other symbols or whitespace
        out += escapeHtml(line[i]);
        i++;
      }

      return '<span class="line">' + (out || '&nbsp;') + '</span>';
    }).join('');
  }

  // Alias highlightPython to highlightCode for backwards compatibility
  const highlightPython = highlightCode;

  /* ==========================================================================
     1. SEMESTER MANAGEMENT
     ========================================================================== */

  function loadSemesters() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEMESTERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load semesters from localStorage:', e);
    }

    if (window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.semesters)) {
      const cloned = JSON.parse(JSON.stringify(window.DEFAULT_DATA.semesters));
      saveSemesters(cloned);
      return cloned;
    }

    return [
      { id: 'sem-1', name: 'Sem 1', title: 'Semester 1', desc: 'First Year Foundation & Programming Core' },
      { id: 'sem-3', name: 'Sem 3', title: 'Semester 3', desc: 'Second Year Core Computing & Data Structures' },
      { id: 'sem-5', name: 'Sem 5', title: 'Semester 5', desc: 'Third Year Advanced Computing & Python' }
    ];
  }

  function saveSemesters(semesters) {
    try {
      localStorage.setItem(STORAGE_KEY_SEMESTERS, JSON.stringify(semesters));
      return true;
    } catch (e) {
      console.error('Failed to save semesters:', e);
      return false;
    }
  }

  function getSemesterById(id) {
    const list = loadSemesters();
    return list.find(s => String(s.id) === String(id)) || null;
  }

  function addSemester(data) {
    const semesters = loadSemesters();
    const cleanName = (data.name || `Sem ${semesters.length + 1}`).trim();
    const cleanTitle = (data.title || `Semester ${semesters.length + 1}`).trim();
    const cleanDesc = (data.desc || '').trim();

    let id = data.id;
    if (!id || id.trim() === '') {
      id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `sem-${Date.now()}`;
    }

    let finalId = id;
    let counter = 1;
    while (semesters.some(s => s.id === finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    const newSem = {
      id: finalId,
      name: cleanName,
      title: cleanTitle,
      desc: cleanDesc
    };

    semesters.push(newSem);
    saveSemesters(semesters);
    return newSem;
  }

  function updateSemester(id, updatedData) {
    const list = loadSemesters();
    const idx = list.findIndex(s => String(s.id) === String(id));
    if (idx === -1) return null;

    const merged = {
      ...list[idx],
      name: updatedData.name !== undefined ? updatedData.name.trim() : list[idx].name,
      title: updatedData.title !== undefined ? updatedData.title.trim() : list[idx].title,
      desc: updatedData.desc !== undefined ? updatedData.desc.trim() : list[idx].desc
    };

    list[idx] = merged;
    saveSemesters(list);
    return merged;
  }

  function deleteSemester(id, deleteAssociated = false) {
    const list = loadSemesters();
    const filtered = list.filter(s => String(s.id) !== String(id));
    if (filtered.length === list.length) return false;

    saveSemesters(filtered);

    if (deleteAssociated) {
      const subjects = loadSubjects().filter(sub => String(sub.semesterId) !== String(id));
      saveSubjects(subjects);
      const questions = loadQuestions().filter(q => String(q.semesterId) !== String(id));
      saveQuestions(questions);
    }
    return true;
  }

  function getActiveSemesterId() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SEM);
      if (saved && getSemesterById(saved)) return saved;
    } catch (e) {}
    return 'sem-5'; // Default to Sem 5
  }

  function setActiveSemesterId(id) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SEM, String(id));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ==========================================================================
     2. SUBJECT MANAGEMENT
     ========================================================================== */

  function loadSubjects(semesterId = null) {
    let subjects = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          subjects = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load subjects from localStorage:', e);
    }

    if (subjects.length === 0 && window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.subjects)) {
      subjects = JSON.parse(JSON.stringify(window.DEFAULT_DATA.subjects));
      saveSubjects(subjects);
    }

    // Fallback default subjects if still empty
    if (subjects.length === 0) {
      subjects = [
        { id: 'sub-py-sem5', semesterId: 'sem-5', name: 'Python Programming', code: 'BSCA501', icon: '🐍', desc: '62 solved programs across 4 units — aim, logic, code & real output.' },
        { id: 'sub-c-sem1', semesterId: 'sem-1', name: 'Programming in C', code: 'BSCA101', icon: '💻', desc: 'Fundamental C practicals, algorithms, loops, arrays & functions.' },
        { id: 'sub-ds-sem3', semesterId: 'sem-3', name: 'Data Structures using C++', code: 'BSCA301', icon: '🧱', desc: 'Stacks, Queues, Linked Lists, Trees & Sorting algorithms.' }
      ];
      saveSubjects(subjects);
    }

    if (semesterId && semesterId !== 'all') {
      return subjects.filter(s => String(s.semesterId) === String(semesterId));
    }
    return subjects;
  }

  function saveSubjects(subjects) {
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
      return true;
    } catch (e) {
      console.error('Failed to save subjects:', e);
      return false;
    }
  }

  function getSubjectById(id) {
    const list = loadSubjects();
    return list.find(s => String(s.id) === String(id)) || null;
  }

  function addSubject(data) {
    const subjects = loadSubjects();
    const cleanName = (data.name || 'New Subject').trim();
    const cleanCode = (data.code || 'SUB-101').trim();
    const semId = data.semesterId || getActiveSemesterId() || 'sem-5';
    const icon = data.icon || '📚';
    const desc = (data.desc || '').trim();

    let id = data.id;
    if (!id || id.trim() === '') {
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      id = `sub-${slug}-${semId}` || `sub-${Date.now()}`;
    }

    let finalId = id;
    let counter = 1;
    while (subjects.some(s => s.id === finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    const newSub = {
      id: finalId,
      semesterId: semId,
      name: cleanName,
      code: cleanCode,
      icon: icon,
      desc: desc
    };

    subjects.push(newSub);
    saveSubjects(subjects);
    return newSub;
  }

  function updateSubject(id, updatedData) {
    const subjects = loadSubjects();
    const idx = subjects.findIndex(s => String(s.id) === String(id));
    if (idx === -1) return null;

    const merged = {
      ...subjects[idx],
      name: updatedData.name !== undefined ? updatedData.name.trim() : subjects[idx].name,
      code: updatedData.code !== undefined ? updatedData.code.trim() : subjects[idx].code,
      semesterId: updatedData.semesterId !== undefined ? updatedData.semesterId : subjects[idx].semesterId,
      icon: updatedData.icon !== undefined ? updatedData.icon : subjects[idx].icon,
      desc: updatedData.desc !== undefined ? updatedData.desc.trim() : subjects[idx].desc
    };

    subjects[idx] = merged;
    saveSubjects(subjects);
    return merged;
  }

  function deleteSubject(id, deleteQuestions = true) {
    const subjects = loadSubjects();
    const filtered = subjects.filter(s => String(s.id) !== String(id));
    if (filtered.length === subjects.length) return false;

    saveSubjects(filtered);

    if (deleteQuestions) {
      const questions = loadQuestions().filter(q => String(q.subjectId) !== String(id));
      saveQuestions(questions);
      const units = loadUnits().filter(u => String(u.subjectId) !== String(id));
      saveUnits(units);
    }
    return true;
  }

  function getActiveSubjectId() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SUB);
      if (saved && getSubjectById(saved)) return saved;
    } catch (e) {}
    // Default subject for active semester
    const activeSem = getActiveSemesterId();
    const subs = loadSubjects(activeSem);
    if (subs.length > 0) return subs[0].id;
    return 'sub-py-sem5';
  }

  function setActiveSubjectId(id) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SUB, String(id));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ==========================================================================
     3. UNITS MANAGEMENT
     ========================================================================== */

  function loadUnits(subjectId = null, semesterId = null) {
    let units = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UNITS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          units = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load units from localStorage:', e);
    }

    if (units.length === 0 && window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.units)) {
      units = JSON.parse(JSON.stringify(window.DEFAULT_DATA.units));
      saveUnits(units);
    }

    // Default migration: assign default subjectId and semesterId if missing
    let modified = false;
    units.forEach(u => {
      if (!u.subjectId) {
        u.subjectId = (u.id.startsWith('unit-c') ? 'sub-c-sem1' : (u.id.startsWith('unit-ds') ? 'sub-ds-sem3' : 'sub-py-sem5'));
        modified = true;
      }
      if (!u.semesterId) {
        u.semesterId = (u.subjectId === 'sub-c-sem1' ? 'sem-1' : (u.subjectId === 'sub-ds-sem3' ? 'sem-3' : 'sem-5'));
        modified = true;
      }
    });
    if (modified) {
      saveUnits(units);
    }

    if (subjectId && subjectId !== 'all') {
      return units.filter(u => String(u.subjectId) === String(subjectId));
    }
    if (semesterId && semesterId !== 'all') {
      return units.filter(u => String(u.semesterId) === String(semesterId));
    }
    return units;
  }

  function saveUnits(units) {
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
      return true;
    } catch (e) {
      console.error('Failed to save units:', e);
      return false;
    }
  }

  function getUnitById(id) {
    const list = loadUnits();
    return list.find(u => String(u.id) === String(id)) || null;
  }

  function addUnit(data) {
    const units = loadUnits();
    const cleanNum = (data.num || `Unit ${units.length + 1}`).trim();
    const cleanTitle = (data.title || '').trim();
    const cleanSub = (data.sub || 'solved programs — aim, logic, code and output').trim();
    const subjectId = data.subjectId || getActiveSubjectId() || 'sub-py-sem5';
    const subObj = getSubjectById(subjectId);
    const semesterId = data.semesterId || (subObj ? subObj.semesterId : getActiveSemesterId()) || 'sem-5';

    let id = data.id;
    if (!id || id.trim() === '') {
      const slug = cleanNum.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      id = `${slug}-${subjectId}` || `unit-${Date.now()}`;
    }

    let finalId = id;
    let counter = 1;
    while (units.some(u => u.id === finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    const newUnit = {
      id: finalId,
      subjectId: subjectId,
      semesterId: semesterId,
      num: cleanNum,
      title: cleanTitle,
      sub: cleanSub,
      questionCount: 0
    };

    units.push(newUnit);
    saveUnits(units);
    return newUnit;
  }

  function updateUnit(id, updatedData) {
    const units = loadUnits();
    const index = units.findIndex(u => String(u.id) === String(id));
    if (index === -1) return null;

    const current = units[index];
    const merged = {
      ...current,
      num: updatedData.num !== undefined ? updatedData.num.trim() : current.num,
      title: updatedData.title !== undefined ? updatedData.title.trim() : current.title,
      sub: updatedData.sub !== undefined ? updatedData.sub.trim() : current.sub,
      subjectId: updatedData.subjectId !== undefined ? updatedData.subjectId : current.subjectId,
      semesterId: updatedData.semesterId !== undefined ? updatedData.semesterId : current.semesterId
    };

    units[index] = merged;
    saveUnits(units);

    // Keep all questions belonging to this unit in sync
    const questions = loadQuestions();
    let questionsChanged = false;
    questions.forEach(q => {
      if (q.unitId === id) {
        q.unitNum = merged.num;
        q.unitTitle = merged.title;
        questionsChanged = true;
      }
    });

    if (questionsChanged) {
      saveQuestions(questions);
    }

    return merged;
  }

  function deleteUnit(id, deleteQuestions = true) {
    const units = loadUnits();
    const filteredUnits = units.filter(u => String(u.id) !== String(id));
    if (filteredUnits.length === units.length) {
      return { success: false, message: 'Unit not found.' };
    }

    saveUnits(filteredUnits);

    let deletedQuestionsCount = 0;
    if (deleteQuestions) {
      const questions = loadQuestions();
      const remainingQuestions = questions.filter(q => {
        if (String(q.unitId) === String(id)) {
          deletedQuestionsCount++;
          return false;
        }
        return true;
      });

      if (deletedQuestionsCount > 0) {
        saveQuestions(remainingQuestions);
      }
    }

    return {
      success: true,
      deletedQuestionsCount: deletedQuestionsCount
    };
  }

  /* ==========================================================================
     4. PRACTICAL QUESTIONS MANAGEMENT
     ========================================================================== */

  function loadQuestions(subjectId = null, semesterId = null) {
    let questions = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          questions = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load questions from localStorage:', e);
    }

    if (questions.length === 0 && window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.questions)) {
      questions = JSON.parse(JSON.stringify(window.DEFAULT_DATA.questions));
      saveQuestions(questions);
    }

    // BACKWARD COMPATIBILITY & MIGRATION:
    // Ensure all questions have semesterId & subjectId
    let changed = false;
    questions.forEach(q => {
      if (!q.subjectId) {
        if (q.id && q.id.startsWith('sem1-c')) q.subjectId = 'sub-c-sem1';
        else if (q.id && q.id.startsWith('sem3-ds')) q.subjectId = 'sub-ds-sem3';
        else q.subjectId = 'sub-py-sem5';
        changed = true;
      }
      if (!q.semesterId) {
        if (q.subjectId === 'sub-c-sem1') q.semesterId = 'sem-1';
        else if (q.subjectId === 'sub-ds-sem3') q.semesterId = 'sem-3';
        else q.semesterId = 'sem-5';
        changed = true;
      }
    });

    if (changed) {
      saveQuestions(questions);
    }

    // Filter strictly if subjectId or semesterId provided
    if (subjectId && subjectId !== 'all') {
      return questions.filter(q => String(q.subjectId) === String(subjectId));
    }
    if (semesterId && semesterId !== 'all') {
      return questions.filter(q => String(q.semesterId) === String(semesterId));
    }
    return questions;
  }

  function saveQuestions(questions) {
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
      return true;
    } catch (e) {
      console.error('Failed to save questions:', e);
      return false;
    }
  }

  function getQuestionById(id) {
    const questions = loadQuestions();
    return questions.find(q => String(q.id) === String(id)) || null;
  }

  function addQuestion(data) {
    const questions = loadQuestions();

    const subjectId = data.subjectId || getActiveSubjectId() || 'sub-py-sem5';
    const subObj = getSubjectById(subjectId);
    const semesterId = data.semesterId || (subObj ? subObj.semesterId : getActiveSemesterId()) || 'sem-5';

    const unitList = loadUnits(subjectId);
    const unitId = data.unitId || (unitList.length > 0 ? unitList[0].id : 'unit-1');
    const unitObj = unitList.find(u => u.id === unitId) || { num: 'Unit I', title: (subObj ? subObj.name : 'Practicals') };

    // Determine practical number within subject
    let practicalNum = parseInt(data.practicalNumber, 10);
    if (isNaN(practicalNum) || practicalNum <= 0) {
      const subjectUnitQuestions = questions.filter(q => q.subjectId === subjectId && q.unitId === unitId);
      practicalNum = subjectUnitQuestions.length + 1;
    }

    const tag = data.tag || `Q${practicalNum}`;
    const id = data.id || `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const title = (data.title || '').trim();
    const questionText = (data.question || title).trim();
    const logic = (data.logic || data.answer || '').trim();
    const code = (data.code || '').trim();
    const output = (data.output || '').trim();
    const category = (data.category || unitObj.title.split(',')[0].trim()).trim();
    const chartSrc = (data.chartSrc || '').trim();
    const chartAlt = (data.chartAlt || (chartSrc ? `Chart for ${title}` : '')).trim();

    const codeHtml = highlightCode(code);
    const dataSearch = `${title} ${questionText} ${logic} ${category} ${tag}`.toLowerCase();

    const newQuestion = {
      id: id,
      semesterId: semesterId,
      subjectId: subjectId,
      unitId: unitId,
      unitNum: unitObj.num,
      unitTitle: unitObj.title,
      practicalNumber: practicalNum,
      tag: tag,
      title: title,
      question: questionText,
      category: category,
      logic: logic,
      code: code,
      codeHtml: codeHtml,
      output: output,
      chartSrc: chartSrc,
      chartAlt: chartAlt,
      dataSearch: dataSearch,
      createdAt: new Date().toISOString()
    };

    questions.push(newQuestion);
    saveQuestions(questions);
    return newQuestion;
  }

  function updateQuestion(id, updatedData) {
    const questions = loadQuestions();
    const index = questions.findIndex(q => String(q.id) === String(id));
    if (index === -1) return null;

    const current = questions[index];
    const subjectId = updatedData.subjectId || current.subjectId || 'sub-py-sem5';
    const semesterId = updatedData.semesterId || current.semesterId || 'sem-5';

    const unitList = loadUnits(subjectId);
    const unitId = updatedData.unitId || current.unitId;
    const unitObj = unitList.find(u => u.id === unitId) || { num: current.unitNum, title: current.unitTitle };

    const practicalNum = updatedData.practicalNumber !== undefined ? parseInt(updatedData.practicalNumber, 10) : current.practicalNumber;
    const tag = updatedData.tag || `Q${practicalNum}`;
    const title = updatedData.title !== undefined ? updatedData.title.trim() : current.title;
    const questionText = updatedData.question !== undefined ? updatedData.question.trim() : current.question;
    const logic = updatedData.logic !== undefined ? updatedData.logic.trim() : current.logic;
    const code = updatedData.code !== undefined ? updatedData.code.trim() : current.code;
    const output = updatedData.output !== undefined ? updatedData.output.trim() : current.output;
    const category = updatedData.category !== undefined ? updatedData.category.trim() : current.category;
    const chartSrc = updatedData.chartSrc !== undefined ? updatedData.chartSrc.trim() : (current.chartSrc || '');
    const chartAlt = updatedData.chartAlt !== undefined ? updatedData.chartAlt.trim() : (current.chartAlt || '');

    const codeHtml = highlightCode(code);
    const dataSearch = `${title} ${questionText} ${logic} ${category} ${tag}`.toLowerCase();

    const merged = {
      ...current,
      semesterId: semesterId,
      subjectId: subjectId,
      unitId: unitId,
      unitNum: unitObj.num,
      unitTitle: unitObj.title,
      practicalNumber: practicalNum,
      tag: tag,
      title: title,
      question: questionText,
      category: category,
      logic: logic,
      code: code,
      codeHtml: codeHtml,
      output: output,
      chartSrc: chartSrc,
      chartAlt: chartAlt,
      dataSearch: dataSearch,
      updatedAt: new Date().toISOString()
    };

    questions[index] = merged;
    saveQuestions(questions);
    return merged;
  }

  function deleteQuestion(id) {
    const questions = loadQuestions();
    const initialLength = questions.length;
    const filtered = questions.filter(q => String(q.id) !== String(id));

    if (filtered.length === initialLength) {
      return false;
    }

    saveQuestions(filtered);
    return true;
  }

  function reorderQuestions(unitId, fromIndex, toIndex, subjectId = null) {
    const questions = loadQuestions();
    const unitIndices = [];
    questions.forEach((q, idx) => {
      const matchSub = !subjectId || q.subjectId === subjectId;
      if (q.unitId === unitId && matchSub) unitIndices.push(idx);
    });

    if (fromIndex < 0 || fromIndex >= unitIndices.length || toIndex < 0 || toIndex >= unitIndices.length) {
      return false;
    }

    const globalFrom = unitIndices[fromIndex];
    const globalTo = unitIndices[toIndex];

    const [moved] = questions.splice(globalFrom, 1);
    questions.splice(globalTo, 0, moved);

    let count = 1;
    questions.forEach(q => {
      const matchSub = !subjectId || q.subjectId === subjectId;
      if (q.unitId === unitId && matchSub) {
        q.practicalNumber = count;
        q.tag = `Q${count}`;
        count++;
      }
    });

    saveQuestions(questions);
    return true;
  }

  function searchQuestions(query, unitId, category, subjectId = null, semesterId = null) {
    let list = loadQuestions();

    if (semesterId && semesterId !== 'all') {
      list = list.filter(q => q.semesterId === semesterId);
    }

    if (subjectId && subjectId !== 'all') {
      list = list.filter(q => q.subjectId === subjectId);
    }

    if (unitId && unitId !== 'all') {
      list = list.filter(q => q.unitId === unitId);
    }

    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      list = list.filter(q => q.category && q.category.toLowerCase().includes(catLower));
    }

    if (query && query.trim() !== '') {
      const qLower = query.trim().toLowerCase();
      list = list.filter(q => {
        const titleMatch = (q.title || '').toLowerCase().includes(qLower);
        const questionMatch = (q.question || '').toLowerCase().includes(qLower);
        const logicMatch = (q.logic || '').toLowerCase().includes(qLower);
        const codeMatch = (q.code || '').toLowerCase().includes(qLower);
        const outputMatch = (q.output || '').toLowerCase().includes(qLower);
        const catMatch = (q.category || '').toLowerCase().includes(qLower);
        const tagMatch = (q.tag || '').toLowerCase().includes(qLower);
        const numMatch = String(q.practicalNumber || '').toLowerCase().includes(qLower);

        return titleMatch || questionMatch || logicMatch || codeMatch || outputMatch || catMatch || tagMatch || numMatch;
      });
    }

    return list;
  }

  function resetToDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY_SEMESTERS);
      localStorage.removeItem(STORAGE_KEY_SUBJECTS);
      localStorage.removeItem(STORAGE_KEY_QUESTIONS);
      localStorage.removeItem(STORAGE_KEY_UNITS);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SEM);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SUB);
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }

    if (window.DEFAULT_DATA) {
      const semesters = JSON.parse(JSON.stringify(window.DEFAULT_DATA.semesters || []));
      const subjects = JSON.parse(JSON.stringify(window.DEFAULT_DATA.subjects || []));
      const units = JSON.parse(JSON.stringify(window.DEFAULT_DATA.units || []));
      const questions = JSON.parse(JSON.stringify(window.DEFAULT_DATA.questions || []));

      saveSemesters(semesters);
      saveSubjects(subjects);
      saveUnits(units);
      saveQuestions(questions);

      return { semesters, subjects, units, questions };
    }

    return { semesters: [], subjects: [], units: [], questions: [] };
  }

  function exportQuestionsJSON(subjectId = null, semesterId = null) {
    const questions = loadQuestions(subjectId, semesterId);
    const units = loadUnits(subjectId, semesterId);
    const subjects = loadSubjects(semesterId);
    const semesters = loadSemesters();

    const subObj = subjectId ? getSubjectById(subjectId) : null;
    const semObj = semesterId ? getSemesterById(semesterId) : (subObj ? getSemesterById(subObj.semesterId) : null);

    const payload = {
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'LJCCA Practical Lab Manual Portal',
      semester: semObj || null,
      subject: subObj || null,
      totalQuestions: questions.length,
      semesters: semesters,
      subjects: subjects,
      units: units,
      questions: questions
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const filename = subObj ? `${subObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-practicals.json` : 'all-practicals-data.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  }

  function exportQuestionsPDF(subjectId = null, semesterId = null) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF generation engine is initializing. Please wait a second and try again.');
      return false;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const activeSubId = subjectId || getActiveSubjectId();
    const subObj = getSubjectById(activeSubId);
    const activeSemId = semesterId || (subObj ? subObj.semesterId : getActiveSemesterId());
    const semObj = getSemesterById(activeSemId);

    const questions = loadQuestions(activeSubId, activeSemId);
    const units = loadUnits(activeSubId, activeSemId);

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm
    let y = margin;

    function checkAddPage(neededHeight = 20) {
      if (y + neededHeight > pageHeight - 16) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    }

    const subName = subObj ? subObj.name : 'Computer Applications';
    const subCode = subObj ? subObj.code : 'CS-LAB';
    const semName = semObj ? semObj.name : 'Semester 5';

    // Cover Header Banner
    doc.setFillColor(39, 78, 112); // #274e70
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`LJCCA — ${subName} (${subCode})`, margin + 4, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`BS(CA) ${semName} | Solved Programs: ${questions.length} across ${units.length} Units | Generated: ${new Date().toLocaleDateString()}`, margin + 4, y + 16);

    y += 28;

    // Iterate Units
    units.forEach((unit) => {
      checkAddPage(30);

      // Unit Header
      doc.setFillColor(236, 242, 248);
      doc.setDrawColor(55, 118, 171);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 10, 'FD');

      doc.setTextColor(25, 55, 90);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`${unit.num}: ${unit.title}`, margin + 4, y + 6.5);

      y += 14;

      const unitQuestions = questions.filter(q => q.unitId === unit.id);
      if (unitQuestions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text('No practical programs currently added in this unit.', margin + 4, y);
        y += 8;
      } else {
        unitQuestions.forEach((q) => {
          checkAddPage(35);

          // Card Box Background
          const startY = y;
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(215, 225, 235);
          doc.setLineWidth(0.3);

          // Tag Badge
          doc.setFillColor(55, 118, 171);
          doc.roundedRect(margin + 2, y + 2, 12, 6, 1.5, 1.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(q.tag || 'Q', margin + 8, y + 6.2, { align: 'center' });

          // Question Title
          doc.setTextColor(20, 30, 45);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          const titleLines = doc.splitTextToSize(q.title || 'Untitled Practical', contentWidth - 22);
          doc.text(titleLines, margin + 18, y + 6.5);

          y += 9 + (titleLines.length * 4);

          // Logic
          if (q.logic) {
            checkAddPage(20);
            doc.setTextColor(100, 115, 130);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('LOGIC & APPROACH:', margin + 4, y);
            y += 4;

            doc.setTextColor(50, 60, 75);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            const cleanLogic = q.logic.replace(/<[^>]+>/g, '');
            const logicLines = doc.splitTextToSize(cleanLogic, contentWidth - 8);
            doc.text(logicLines, margin + 4, y);
            y += (logicLines.length * 3.8) + 3;
          }

          // Code Box
          if (q.code) {
            checkAddPage(25);
            doc.setTextColor(100, 115, 130);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('PROGRAM CODE:', margin + 4, y);
            y += 4;

            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            const rawCodeLines = q.code.split('\n');
            const codeLines = [];
            rawCodeLines.forEach(ln => {
              const wrapped = doc.splitTextToSize(ln, contentWidth - 12);
              wrapped.forEach(w => codeLines.push(w));
            });

            const codeBoxHeight = (codeLines.length * 3.6) + 4;
            checkAddPage(codeBoxHeight);

            doc.setFillColor(244, 247, 250);
            doc.setDrawColor(210, 220, 230);
            doc.rect(margin + 2, y - 2, contentWidth - 4, codeBoxHeight, 'FD');

            doc.setTextColor(20, 30, 45);
            let codeY = y + 2;
            codeLines.forEach(ln => {
              doc.text(ln, margin + 5, codeY);
              codeY += 3.6;
            });

            y += codeBoxHeight + 3;
          }

          // Output Box
          if (q.output) {
            checkAddPage(20);
            doc.setTextColor(100, 115, 130);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('PROGRAM OUTPUT:', margin + 4, y);
            y += 4;

            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            const outLines = doc.splitTextToSize(q.output, contentWidth - 12);
            const outBoxHeight = (outLines.length * 3.6) + 4;
            checkAddPage(outBoxHeight);

            doc.setFillColor(240, 248, 244);
            doc.setDrawColor(180, 220, 200);
            doc.rect(margin + 2, y - 2, contentWidth - 4, outBoxHeight, 'FD');

            doc.setTextColor(15, 95, 55);
            let outY = y + 2;
            outLines.forEach(ln => {
              doc.text(ln, margin + 5, outY);
              outY += 3.6;
            });

            y += outBoxHeight + 6;
          }

          // Card separator line
          doc.setDrawColor(220, 230, 240);
          doc.line(margin + 2, y, margin + contentWidth - 2, y);
          y += 6;
        });
      }

      y += 8;
    });

    // Add Page Numbers in Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 160);
      doc.text(`LJCCA ${subName} Manual | ${semName} — Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    const pdfFilename = `${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-manual.pdf`;
    doc.save(pdfFilename);
    return true;
  }

  function importQuestionsJSON(jsonData) {
    try {
      let data = jsonData;
      if (typeof jsonData === 'string') {
        data = JSON.parse(jsonData);
      }

      if (!data) {
        return { success: false, message: 'Invalid data: file is empty.' };
      }

      if (data.semesters && Array.isArray(data.semesters)) {
        saveSemesters(data.semesters);
      }

      if (data.subjects && Array.isArray(data.subjects)) {
        saveSubjects(data.subjects);
      }

      if (data.units && Array.isArray(data.units)) {
        saveUnits(data.units);
      }

      const rawQuestions = Array.isArray(data) ? data : (data.questions || []);
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        return { success: false, message: 'No questions found in imported file.' };
      }

      const activeSub = getActiveSubjectId();
      const activeSem = getActiveSemesterId();

      const validatedQuestions = [];
      for (const item of rawQuestions) {
        const title = (item.title || item.question || '').trim();
        if (!title) continue;

        const practicalNum = parseInt(item.practicalNumber, 10) || (validatedQuestions.length + 1);
        const tag = item.tag || `Q${practicalNum}`;
        const code = item.code || '';
        const logic = item.logic || item.answer || '';
        const output = item.output || '';
        const category = item.category || 'General';
        const chartSrc = item.chartSrc || '';
        const chartAlt = item.chartAlt || '';
        const subId = item.subjectId || activeSub || 'sub-py-sem5';
        const semId = item.semesterId || activeSem || 'sem-5';

        validatedQuestions.push({
          id: item.id || `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          semesterId: semId,
          subjectId: subId,
          unitId: item.unitId || 'unit-1',
          unitNum: item.unitNum || 'Unit I',
          unitTitle: item.unitTitle || 'General',
          practicalNumber: practicalNum,
          tag: tag,
          title: title,
          question: item.question || title,
          category: category,
          logic: logic,
          code: code,
          codeHtml: highlightCode(code),
          output: output,
          chartSrc: chartSrc,
          chartAlt: chartAlt,
          dataSearch: `${title} ${logic} ${category} ${tag}`.toLowerCase()
        });
      }

      saveQuestions(validatedQuestions);
      return {
        success: true,
        count: validatedQuestions.length,
        message: 'Questions imported successfully.'
      };
    } catch (e) {
      return { success: false, message: 'Invalid question data format. JSON parse failed.' };
    }
  }

  // Export functions to global window.PracticalsStorage
  window.PracticalsStorage = {
    // Semesters
    loadSemesters,
    saveSemesters,
    getSemesterById,
    addSemester,
    updateSemester,
    deleteSemester,
    getActiveSemesterId,
    setActiveSemesterId,

    // Subjects
    loadSubjects,
    saveSubjects,
    getSubjectById,
    addSubject,
    updateSubject,
    deleteSubject,
    getActiveSubjectId,
    setActiveSubjectId,

    // Units
    loadUnits,
    saveUnits,
    getUnitById,
    addUnit,
    updateUnit,
    deleteUnit,

    // Questions
    loadQuestions,
    saveQuestions,
    getQuestionById,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    searchQuestions,

    // Tools & Utilities
    resetToDefaults,
    exportQuestionsPDF,
    exportQuestionsJSON,
    importQuestionsJSON,
    highlightCode,
    highlightPython,
    escapeHtml
  };

})(window);
