/**
 * supabase-client.js
 * Supabase client and sync layer for LJCCA Practicals Lab Manual Portal
 */
(function (window) {
  'use strict';

  let client = null;

  function initClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase JS SDK (@supabase/supabase-js) not loaded yet.');
      return null;
    }

    const url = window.SupabaseConfig.getUrl();
    const key = window.SupabaseConfig.getKey();

    if (!url || !key) {
      console.warn('Supabase URL or Key missing in configuration.');
      return null;
    }

    try {
      client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      return client;
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      return null;
    }
  }

  function getClient() {
    if (!client) {
      initClient();
    }
    return client;
  }

  /* --------------------------------------------------------------------------
     Mappers: Transform DB rows (snake_case) to App objects (camelCase) & vice-versa
     -------------------------------------------------------------------------- */

  function mapSemesterToDb(sem) {
    return {
      id: sem.id,
      name: sem.name || '',
      title: sem.title || '',
      desc: sem.desc || ''
    };
  }

  function mapSemesterFromDb(row) {
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      desc: row.desc || ''
    };
  }

  function mapSubjectToDb(sub) {
    return {
      id: sub.id,
      semester_id: sub.semesterId || sub.semester_id,
      name: sub.name || '',
      code: sub.code || '',
      icon: sub.icon || '💻',
      desc: sub.desc || ''
    };
  }

  function mapSubjectFromDb(row) {
    return {
      id: row.id,
      semesterId: row.semester_id,
      name: row.name,
      code: row.code || '',
      icon: row.icon || '💻',
      desc: row.desc || ''
    };
  }

  function mapUnitToDb(unit) {
    return {
      id: unit.id,
      subject_id: unit.subjectId || unit.subject_id,
      semester_id: unit.semesterId || unit.semester_id,
      num: unit.num || '',
      title: unit.title || '',
      sub: unit.sub || '',
      question_count: parseInt(unit.questionCount || unit.question_count, 10) || 0
    };
  }

  function mapUnitFromDb(row) {
    return {
      id: row.id,
      subjectId: row.subject_id,
      semesterId: row.semester_id,
      num: row.num,
      title: row.title,
      sub: row.sub || '',
      questionCount: row.question_count || 0
    };
  }

  function mapQuestionToDb(q) {
    return {
      id: q.id,
      unit_id: q.unitId || q.unit_id,
      subject_id: q.subjectId || q.subject_id,
      semester_id: q.semesterId || q.semester_id,
      unit_num: q.unitNum || q.unit_num || '',
      unit_title: q.unitTitle || q.unit_title || '',
      practical_number: parseInt(q.practicalNumber || q.practical_number, 10) || 1,
      tag: q.tag || '',
      title: q.title || '',
      question: q.question || q.title || '',
      category: q.category || '',
      logic: q.logic || '',
      code: q.code || '',
      code_html: q.codeHtml || q.code_html || '',
      output_label: q.outputLabel || q.output_label || 'Output',
      output_class: q.outputClass || q.output_class || '',
      output: q.output || '',
      chart_src: q.chartSrc || q.chart_src || '',
      chart_alt: q.chartAlt || q.chart_alt || '',
      data_search: q.dataSearch || q.data_search || ''
    };
  }

  function mapQuestionFromDb(row) {
    return {
      id: row.id,
      unitId: row.unit_id,
      subjectId: row.subject_id,
      semesterId: row.semester_id,
      unitNum: row.unit_num || '',
      unitTitle: row.unit_title || '',
      practicalNumber: row.practical_number || 1,
      tag: row.tag || '',
      title: row.title || '',
      question: row.question || row.title || '',
      category: row.category || '',
      logic: row.logic || '',
      code: row.code || '',
      codeHtml: row.code_html || (window.PracticalsStorage ? window.PracticalsStorage.highlightCode(row.code || '') : ''),
      outputLabel: row.output_label || 'Output',
      outputClass: row.output_class || '',
      output: row.output || '',
      chartSrc: row.chart_src || '',
      chartAlt: row.chart_alt || '',
      dataSearch: row.data_search || `${row.title} ${row.logic} ${row.category} ${row.tag}`.toLowerCase()
    };
  }

  /* --------------------------------------------------------------------------
     Connection and Diagnostic Checks
     -------------------------------------------------------------------------- */

  async function testConnection() {
    const sb = getClient();
    if (!sb) {
      return { ok: false, message: 'Supabase client could not be initialized. Check URL & Anon Key.' };
    }

    try {
      // Test querying semesters table
      const { data, error, status } = await sb.from('semesters').select('id').limit(1);

      if (error) {
        if (status === 404 || error.code === 'PGRST205' || (error.message && error.message.includes('schema cache'))) {
          return {
            ok: false,
            tableMissing: true,
            message: "Connected to Supabase, but database tables ('semesters', etc.) are not created yet. Please execute 'supabase_schema.sql' in the Supabase SQL Editor."
          };
        }
        return { ok: false, error, message: error.message || 'Supabase error' };
      }

      return { ok: true, message: 'Successfully connected to Supabase Database!' };
    } catch (e) {
      return { ok: false, error: e, message: e.message || 'Connection failed' };
    }
  }

  /* --------------------------------------------------------------------------
     Cloud CRUD Operations
     -------------------------------------------------------------------------- */

  async function fetchAllData() {
    const sb = getClient();
    if (!sb) return null;

    try {
      const [semRes, subRes, unitRes, qRes] = await Promise.all([
        sb.from('semesters').select('*').order('name'),
        sb.from('subjects').select('*').order('name'),
        sb.from('units').select('*').order('num'),
        sb.from('questions').select('*').order('practical_number')
      ]);

      if (semRes.error || subRes.error || unitRes.error || qRes.error) {
        console.warn('Error fetching data from Supabase:', semRes.error || subRes.error || unitRes.error || qRes.error);
        return null;
      }

      return {
        semesters: (semRes.data || []).map(mapSemesterFromDb),
        subjects: (subRes.data || []).map(mapSubjectFromDb),
        units: (unitRes.data || []).map(mapUnitFromDb),
        questions: (qRes.data || []).map(mapQuestionFromDb)
      };
    } catch (e) {
      console.error('fetchAllData error:', e);
      return null;
    }
  }

  // Semesters CRUD
  async function upsertSemester(sem) {
    const sb = getClient();
    if (!sb) return false;
    const dbRow = mapSemesterToDb(sem);
    const { error } = await sb.from('semesters').upsert(dbRow);
    if (error) {
      console.error('upsertSemester failed:', error);
      return false;
    }
    return true;
  }

  async function deleteSemester(id) {
    const sb = getClient();
    if (!sb) return false;
    const { error } = await sb.from('semesters').delete().eq('id', id);
    if (error) {
      console.error('deleteSemester failed:', error);
      return false;
    }
    return true;
  }

  // Subjects CRUD
  async function upsertSubject(sub) {
    const sb = getClient();
    if (!sb) return false;
    const dbRow = mapSubjectToDb(sub);
    const { error } = await sb.from('subjects').upsert(dbRow);
    if (error) {
      console.error('upsertSubject failed:', error);
      return false;
    }
    return true;
  }

  async function deleteSubject(id) {
    const sb = getClient();
    if (!sb) return false;
    const { error } = await sb.from('subjects').delete().eq('id', id);
    if (error) {
      console.error('deleteSubject failed:', error);
      return false;
    }
    return true;
  }

  // Units CRUD
  async function upsertUnit(unit) {
    const sb = getClient();
    if (!sb) return false;
    const dbRow = mapUnitToDb(unit);
    const { error } = await sb.from('units').upsert(dbRow);
    if (error) {
      console.error('upsertUnit failed:', error);
      return false;
    }
    return true;
  }

  async function deleteUnit(id) {
    const sb = getClient();
    if (!sb) return false;
    const { error } = await sb.from('units').delete().eq('id', id);
    if (error) {
      console.error('deleteUnit failed:', error);
      return false;
    }
    return true;
  }

  // Questions CRUD
  async function upsertQuestion(q) {
    const sb = getClient();
    if (!sb) return false;
    const dbRow = mapQuestionToDb(q);
    const { error } = await sb.from('questions').upsert(dbRow);
    if (error) {
      console.error('upsertQuestion failed:', error);
      return false;
    }
    return true;
  }

  async function deleteQuestion(id) {
    const sb = getClient();
    if (!sb) return false;
    const { error } = await sb.from('questions').delete().eq('id', id);
    if (error) {
      console.error('deleteQuestion failed:', error);
      return false;
    }
    return true;
  }

  async function deleteQuestions(ids) {
    const sb = getClient();
    if (!sb || !ids || !ids.length) return false;
    const { error } = await sb.from('questions').delete().in('id', ids);
    if (error) {
      console.error('deleteQuestions failed:', error);
      return false;
    }
    return true;
  }

  /* --------------------------------------------------------------------------
     Push All Local Data to Supabase (Initial / Manual Seed)
     -------------------------------------------------------------------------- */
  async function pushAllToCloud(data, onProgress = null) {
    const sb = getClient();
    if (!sb) return { success: false, message: 'Supabase client not initialized.' };

    try {
      if (onProgress) onProgress('Checking connection...', 5);
      const test = await testConnection();
      if (!test.ok) {
        return { success: false, message: test.message, tableMissing: test.tableMissing };
      }

      const semesters = (data.semesters || []).map(mapSemesterToDb);
      const subjects = (data.subjects || []).map(mapSubjectToDb);
      const units = (data.units || []).map(mapUnitToDb);
      const questions = (data.questions || []).map(mapQuestionToDb);

      if (onProgress) onProgress(`Syncing ${semesters.length} semesters...`, 15);
      if (semesters.length > 0) {
        const { error: semErr } = await sb.from('semesters').upsert(semesters);
        if (semErr) throw new Error('Semesters sync failed: ' + semErr.message);
      }

      if (onProgress) onProgress(`Syncing ${subjects.length} subjects...`, 30);
      if (subjects.length > 0) {
        const { error: subErr } = await sb.from('subjects').upsert(subjects);
        if (subErr) throw new Error('Subjects sync failed: ' + subErr.message);
      }

      if (onProgress) onProgress(`Syncing ${units.length} units...`, 50);
      if (units.length > 0) {
        const { error: unitErr } = await sb.from('units').upsert(units);
        if (unitErr) throw new Error('Units sync failed: ' + unitErr.message);
      }

      if (onProgress) onProgress(`Syncing ${questions.length} questions in batches...`, 70);
      // Upload questions in chunks of 50 to avoid request payload limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        const { error: qErr } = await sb.from('questions').upsert(chunk);
        if (qErr) throw new Error(`Questions sync failed on batch ${i}: ` + qErr.message);
        const progressPct = 70 + Math.round(((i + chunk.length) / questions.length) * 28);
        if (onProgress) onProgress(`Synced ${Math.min(i + CHUNK_SIZE, questions.length)} of ${questions.length} questions...`, progressPct);
      }

      if (onProgress) onProgress('All data synced successfully to Supabase!', 100);
      return { success: true, count: questions.length, message: 'All data successfully synced to Supabase!' };
    } catch (e) {
      console.error('pushAllToCloud error:', e);
      return { success: false, message: e.message || 'Push to cloud failed' };
    }
  }

  window.SupabaseSync = {
    initClient,
    getClient,
    testConnection,
    fetchAllData,
    pushAllToCloud,
    upsertSemester,
    deleteSemester,
    upsertSubject,
    deleteSubject,
    upsertUnit,
    deleteUnit,
    upsertQuestion,
    deleteQuestion,
    deleteQuestions
  };

})(window);
