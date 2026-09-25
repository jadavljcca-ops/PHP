/**
 * storage.js - Data Layer for Python Practicals Lab Manual
 * Handles localStorage persistence, CRUD operations, searching, filtering, and JSON import/export.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_QUESTIONS = 'python_practicals_questions_v1';
  const STORAGE_KEY_UNITS = 'python_practicals_units_v1';

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

  // Pure JavaScript Python Syntax Highlighter
  // Matches the exact CSS classes from reference: tok-kw, tok-str, tok-com, tok-num, tok-fn, and line numbering
  function highlightPython(code) {
    if (!code) return '<span class="line">&nbsp;</span>';

    const lines = code.split(/\r?\n/);
    const keywords = new Set([
      'def', 'class', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'try',
      'except', 'finally', 'with', 'as', 'import', 'from', 'lambda', 'pass',
      'break', 'continue', 'global', 'nonlocal', 'raise', 'yield', 'assert',
      'and', 'or', 'not', 'is', 'None', 'True', 'False'
    ]);

    const builtins = new Set([
      'print', 'input', 'int', 'float', 'str', 'len', 'range', 'list', 'tuple',
      'dict', 'set', 'complex', 'super', 'type', 'open', 'enumerate', 'zip',
      'max', 'min', 'sum', 'abs', 'round', 'sorted', 'reversed', 'map', 'filter',
      'any', 'all', 'id', 'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr',
      'staticmethod', 'classmethod', 'property'
    ]);

    return lines.map(line => {
      let out = '';
      let i = 0;
      const len = line.length;

      while (i < len) {
        // Comment: # to end of line
        if (line[i] === '#') {
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

        // Identifiers, keywords, built-in functions, decorators
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

  // Load questions from localStorage or defaults
  function loadQuestions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load questions from localStorage:', e);
    }

    // Fallback to default dataset
    if (window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.questions)) {
      const cloned = JSON.parse(JSON.stringify(window.DEFAULT_DATA.questions));
      saveQuestions(cloned);
      return cloned;
    }
    return [];
  }

  // Save questions to localStorage
  function saveQuestions(questions) {
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
      return true;
    } catch (e) {
      console.error('Failed to save questions to localStorage:', e);
      return false;
    }
  }

  // Load units list
  function loadUnits() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UNITS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load units from localStorage:', e);
    }

    if (window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.units)) {
      const cloned = JSON.parse(JSON.stringify(window.DEFAULT_DATA.units));
      saveUnits(cloned);
      return cloned;
    }

    return [
      { id: 'unit-1', num: 'Unit I', title: 'Introduction to Python, Data Types and Control Flow Statements', sub: 'solved programs — aim, logic, code and output' },
      { id: 'unit-2', num: 'Unit II', title: 'Arrays, Functions, List, Tuples and Dictionaries', sub: 'solved programs — aim, logic, code and output' },
      { id: 'unit-3', num: 'Unit III', title: 'Concepts of OOP and Exception Handling', sub: 'solved programs — aim, logic, code and output' },
      { id: 'unit-4', num: 'Unit IV', title: 'Python Database Management, Data Analysis and Data Visualization', sub: 'solved programs — aim, logic, code and output' }
    ];
  }

  // Save units list
  function saveUnits(units) {
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
      return true;
    } catch (e) {
      console.error('Failed to save units to localStorage:', e);
      return false;
    }
  }

  // Get unit by ID
  function getUnitById(id) {
    const units = loadUnits();
    return units.find(u => String(u.id) === String(id)) || null;
  }

  // Add new unit
  function addUnit(data) {
    const units = loadUnits();
    const cleanNum = (data.num || `Unit ${units.length + 1}`).trim();
    const cleanTitle = (data.title || '').trim();
    const cleanSub = (data.sub || 'solved programs — aim, logic, code and output').trim();

    // Auto-create an ID if not given
    let id = data.id;
    if (!id || id.trim() === '') {
      const slug = cleanNum.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      id = slug || `unit-${Date.now()}`;
    }

    // Ensure unique ID
    let finalId = id;
    let counter = 1;
    while (units.some(u => u.id === finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    const newUnit = {
      id: finalId,
      num: cleanNum,
      title: cleanTitle,
      sub: cleanSub,
      questionCount: 0
    };

    units.push(newUnit);
    saveUnits(units);
    return newUnit;
  }

  // Update existing unit
  function updateUnit(id, updatedData) {
    const units = loadUnits();
    const index = units.findIndex(u => String(u.id) === String(id));
    if (index === -1) return null;

    const current = units[index];
    const cleanNum = updatedData.num !== undefined ? updatedData.num.trim() : current.num;
    const cleanTitle = updatedData.title !== undefined ? updatedData.title.trim() : current.title;
    const cleanSub = updatedData.sub !== undefined ? updatedData.sub.trim() : current.sub;

    const merged = {
      ...current,
      num: cleanNum,
      title: cleanTitle,
      sub: cleanSub
    };

    units[index] = merged;
    saveUnits(units);

    // Keep all questions belonging to this unit in sync
    const questions = loadQuestions();
    let questionsChanged = false;
    questions.forEach(q => {
      if (q.unitId === id) {
        q.unitNum = cleanNum;
        q.unitTitle = cleanTitle;
        questionsChanged = true;
      }
    });

    if (questionsChanged) {
      saveQuestions(questions);
    }

    return merged;
  }

  // Delete unit (and optionally its questions)
  function deleteUnit(id, deleteQuestions = true) {
    const units = loadUnits();
    const initialUnitsCount = units.length;
    const filteredUnits = units.filter(u => String(u.id) !== String(id));

    if (filteredUnits.length === initialUnitsCount) {
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

  // Get question by ID
  function getQuestionById(id) {
    const questions = loadQuestions();
    return questions.find(q => String(q.id) === String(id)) || null;
  }

  // Add new question
  function addQuestion(data) {
    const questions = loadQuestions();

    const unitId = data.unitId || 'unit-1';
    const unitObj = loadUnits().find(u => u.id === unitId) || { num: 'Unit I', title: 'Python' };

    // Determine practical number
    let practicalNum = parseInt(data.practicalNumber, 10);
    if (isNaN(practicalNum) || practicalNum <= 0) {
      const unitQuestions = questions.filter(q => q.unitId === unitId);
      practicalNum = unitQuestions.length + 1;
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

    // Generate syntax highlighted HTML for student render
    const codeHtml = highlightPython(code);

    // Build data-search string
    const dataSearch = `${title} ${questionText} ${logic} ${category} ${tag}`.toLowerCase();

    const newQuestion = {
      id: id,
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

  // Update existing question
  function updateQuestion(id, updatedData) {
    const questions = loadQuestions();
    const index = questions.findIndex(q => String(q.id) === String(id));
    if (index === -1) {
      return null;
    }

    const current = questions[index];
    const unitId = updatedData.unitId || current.unitId;
    const unitObj = loadUnits().find(u => u.id === unitId) || { num: current.unitNum, title: current.unitTitle };

    const practicalNum = updatedData.practicalNumber !== undefined ? parseInt(updatedData.practicalNumber, 10) : current.practicalNumber;
    const tag = updatedData.tag || `Q${practicalNum}`;
    const title = updatedData.title !== undefined ? updatedData.title.trim() : current.title;
    const questionText = updatedData.question !== undefined ? updatedData.question.trim() : current.question;
    const logic = updatedData.logic !== undefined ? updatedData.logic.trim() : (updatedData.answer !== undefined ? updatedData.answer.trim() : current.logic);
    const code = updatedData.code !== undefined ? updatedData.code.trim() : current.code;
    const output = updatedData.output !== undefined ? updatedData.output.trim() : current.output;
    const category = updatedData.category !== undefined ? updatedData.category.trim() : current.category;
    const chartSrc = updatedData.chartSrc !== undefined ? updatedData.chartSrc.trim() : (current.chartSrc || '');
    const chartAlt = updatedData.chartAlt !== undefined ? updatedData.chartAlt.trim() : (current.chartAlt || '');

    // Regenerate codeHtml if code updated or missing
    const codeHtml = highlightPython(code);
    const dataSearch = `${title} ${questionText} ${logic} ${category} ${tag}`.toLowerCase();

    const merged = {
      ...current,
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

  // Delete question
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

  // Reorder questions within unit
  function reorderQuestions(unitId, fromIndex, toIndex) {
    const questions = loadQuestions();
    const unitIndices = [];
    questions.forEach((q, idx) => {
      if (q.unitId === unitId) unitIndices.push(idx);
    });

    if (fromIndex < 0 || fromIndex >= unitIndices.length || toIndex < 0 || toIndex >= unitIndices.length) {
      return false;
    }

    const globalFrom = unitIndices[fromIndex];
    const globalTo = unitIndices[toIndex];

    const [moved] = questions.splice(globalFrom, 1);
    questions.splice(globalTo, 0, moved);

    // Re-index practical numbers inside unit if desired
    let count = 1;
    questions.forEach(q => {
      if (q.unitId === unitId) {
        q.practicalNumber = count;
        q.tag = `Q${count}`;
        count++;
      }
    });

    saveQuestions(questions);
    return true;
  }

  // Search and filter questions
  function searchQuestions(query, unitId, category) {
    let list = loadQuestions();

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

  // Reset to original 62 default practicals
  function resetToDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY_QUESTIONS);
      localStorage.removeItem(STORAGE_KEY_UNITS);
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }

    if (window.DEFAULT_DATA) {
      const questions = JSON.parse(JSON.stringify(window.DEFAULT_DATA.questions));
      const units = JSON.parse(JSON.stringify(window.DEFAULT_DATA.units));
      saveQuestions(questions);
      saveUnits(units);
      return { questions, units };
    }

    return { questions: [], units: [] };
  }

  // Export questions to JSON file
  function exportQuestionsJSON() {
    const questions = loadQuestions();
    const units = loadUnits();

    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'Python Programming Practical Lab Manual',
      totalQuestions: questions.length,
      units: units,
      questions: questions
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'python-practicals-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  }

  // Export questions to real PDF format (.pdf)
  function exportQuestionsPDF() {
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

    const questions = loadQuestions();
    const units = loadUnits();

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

    // Cover Header Banner
    doc.setFillColor(39, 78, 112); // #274e70
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LJCCA — Python Programming Practical Lab Manual', margin + 4, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`BS(CA) Semester 5 | Solved Programs: ${questions.length} across ${units.length} Units | Generated: ${new Date().toLocaleDateString()}`, margin + 4, y + 16);

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

          // Practical Question Header
          doc.setFillColor(248, 249, 251);
          doc.setDrawColor(215, 220, 228);
          doc.setLineWidth(0.3);
          doc.rect(margin, y, contentWidth, 7, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(20, 20, 20);
          const pracTitle = `Practical #${q.practicalNumber || ''} [${q.tag || 'Q'}] — ${q.title}`;
          const splitTitle = doc.splitTextToSize(pracTitle, contentWidth - 6);
          doc.text(splitTitle[0], margin + 3, y + 4.8);
          y += 9;

          // Topic / Category
          if (q.category) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Category: ${q.category}`, margin + 3, y);
            y += 4.5;
          }

          // Logic
          if (q.logic) {
            const cleanLogic = q.logic.replace(/<[^>]*>/g, '').trim();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.text('Aim & Logic:', margin + 3, y);
            y += 3.8;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.8);
            doc.setTextColor(60, 60, 60);
            const logicLines = doc.splitTextToSize(cleanLogic, contentWidth - 6);
            for (let i = 0; i < logicLines.length; i++) {
              checkAddPage(5);
              doc.text(logicLines[i], margin + 3, y);
              y += 3.6;
            }
            y += 2;
          }

          // Python Code Box
          if (q.code) {
            checkAddPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(30, 70, 110);
            doc.text('Python Code:', margin + 3, y);
            y += 3.8;

            const codeLines = q.code.split(/\r?\n/);
            const lineHeight = 3.4;

            doc.setFont('courier', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(20, 20, 20);

            for (let line of codeLines) {
              checkAddPage(lineHeight + 2);
              doc.setFillColor(245, 247, 250);
              doc.rect(margin + 2, y - 2.6, contentWidth - 4, lineHeight, 'F');
              doc.text(line || ' ', margin + 4, y);
              y += lineHeight;
            }
            y += 2.5;
          }

          // Output Box
          if (q.output) {
            checkAddPage(14);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(40, 40, 40);
            doc.text('Output:', margin + 3, y);
            y += 3.8;

            const outLines = q.output.split(/\r?\n/);
            const lineHeight = 3.4;

            doc.setFont('courier', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(15, 15, 15);

            for (let line of outLines) {
              checkAddPage(lineHeight + 2);
              doc.setFillColor(236, 239, 243);
              doc.rect(margin + 2, y - 2.6, contentWidth - 4, lineHeight, 'F');
              doc.text(line || ' ', margin + 4, y);
              y += lineHeight;
            }
            y += 3.5;
          }

          // Divider
          doc.setDrawColor(225, 228, 233);
          doc.setLineWidth(0.3);
          doc.line(margin, y, margin + contentWidth, y);
          y += 5.5;
        });
      }
      y += 3.5;
    });

    // Page numbering on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text('LJCCA — Python Programming Practical Lab Manual', margin, pageHeight - 8);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
    }

    // Save as genuine .pdf file
    doc.save('python-practicals-lab-manual.pdf');
    return true;
  }

  // Import questions from JSON string
  function importQuestionsJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure: must be an array of questions or an object with a .questions array
      let rawQuestions = null;
      let rawUnits = null;

      if (Array.isArray(data)) {
        rawQuestions = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.questions)) {
          rawQuestions = data.questions;
          if (Array.isArray(data.units)) {
            rawUnits = data.units;
          }
        }
      }

      if (!rawQuestions || rawQuestions.length === 0) {
        return { success: false, message: 'Invalid question data format. No question array found.' };
      }

      // Validate each question has minimal essential fields
      const validatedQuestions = [];
      for (let i = 0; i < rawQuestions.length; i++) {
        const item = rawQuestions[i];
        if (!item || typeof item !== 'object') {
          return { success: false, message: `Invalid question item at index ${i}.` };
        }

        const title = item.title || item.question;
        if (!title || String(title).trim() === '') {
          return { success: false, message: `Question at index ${i} is missing a title/question.` };
        }

        const code = item.code || '';
        const logic = item.logic || item.answer || item.explanation || '';
        const practicalNumber = parseInt(item.practicalNumber, 10) || (i + 1);
        const tag = item.tag || `Q${practicalNumber}`;
        const unitId = item.unitId || 'unit-1';
        const unitNum = item.unitNum || 'Unit I';
        const unitTitle = item.unitTitle || 'Python Practicals';
        const category = item.category || 'General';
        const output = item.output || '';
        const chartSrc = item.chartSrc || '';
        const chartAlt = item.chartAlt || '';

        validatedQuestions.push({
          id: item.id || `q-${Date.now()}-${i}`,
          unitId: unitId,
          unitNum: unitNum,
          unitTitle: unitTitle,
          practicalNumber: practicalNumber,
          tag: tag,
          title: title,
          question: item.question || title,
          category: category,
          logic: logic,
          code: code,
          codeHtml: highlightPython(code),
          output: output,
          chartSrc: chartSrc,
          chartAlt: chartAlt,
          dataSearch: `${title} ${logic} ${category} ${tag}`.toLowerCase()
        });
      }

      saveQuestions(validatedQuestions);
      if (rawUnits && rawUnits.length > 0) {
        saveUnits(rawUnits);
      }

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
    loadQuestions,
    saveQuestions,
    loadUnits,
    saveUnits,
    getUnitById,
    addUnit,
    updateUnit,
    deleteUnit,
    getQuestionById,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    searchQuestions,
    resetToDefaults,
    exportQuestionsPDF,
    exportQuestionsJSON,
    importQuestionsJSON,
    highlightPython,
    escapeHtml
  };

})(window);
