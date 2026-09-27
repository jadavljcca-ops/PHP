/**
 * supabase-config.js
 * Configuration for Supabase Database Integration
 */
(function (window) {
  'use strict';

  // Default credentials provided for project 'nmtdqrcbiisvsktyurbm'
  const DEFAULT_SUPABASE_URL = 'https://nmtdqrcbiisvsktyurbm.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tdGRxcmNiaWlzdnNrdHl1cmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODU1NzcsImV4cCI6MjEwNjA2MTU3N30.vBqYEyv3JtP3w0Yif_A5fzR82CMrQogWudNQyvYPU7I';

  const STORAGE_KEY_URL = 'supabase_project_url';
  const STORAGE_KEY_KEY = 'supabase_anon_key';
  const STORAGE_KEY_SYNC_ENABLED = 'supabase_sync_enabled';

  function getSupabaseUrl() {
    const envVal = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.SUPABASE_URL) ? window.__ENV__.SUPABASE_URL : null;
    return localStorage.getItem(STORAGE_KEY_URL) || envVal || DEFAULT_SUPABASE_URL;
  }

  function getSupabaseKey() {
    const envVal = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY) ? window.__ENV__.SUPABASE_ANON_KEY : null;
    return localStorage.getItem(STORAGE_KEY_KEY) || envVal || DEFAULT_SUPABASE_ANON_KEY;
  }

  function setSupabaseConfig(url, key) {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  }

  function isSyncEnabled() {
    const val = localStorage.getItem(STORAGE_KEY_SYNC_ENABLED);
    return val === null ? true : val === 'true';
  }

  function setSyncEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY_SYNC_ENABLED, enabled ? 'true' : 'false');
  }

  window.SupabaseConfig = {
    getUrl: getSupabaseUrl,
    getKey: getSupabaseKey,
    setConfig: setSupabaseConfig,
    isSyncEnabled: isSyncEnabled,
    setSyncEnabled: setSyncEnabled,
    DEFAULT_URL: DEFAULT_SUPABASE_URL,
    DEFAULT_KEY: DEFAULT_SUPABASE_ANON_KEY
  };
})(window);
