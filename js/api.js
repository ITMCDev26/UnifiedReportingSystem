// ⚠️ REQUIRED: paste your deployed Apps Script Web App URL here.
// Deploy > New deployment > Web app > Execute as Me / Access: Anyone.
const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

const Session = {
  get token() { return localStorage.getItem('ka_token') || ''; },
  get role() { return localStorage.getItem('ka_role') || ''; },
  get displayName() { return localStorage.getItem('ka_name') || ''; },
  save(data) {
    localStorage.setItem('ka_token', data.token || '');
    localStorage.setItem('ka_role', data.role || '');
    localStorage.setItem('ka_name', data.displayName || '');
  },
  clear() {
    localStorage.removeItem('ka_token');
    localStorage.removeItem('ka_role');
    localStorage.removeItem('ka_name');
  },
  isLoggedIn() { return !!this.token; }
};

async function apiCall(action, payload) {
  if (!API_URL || API_URL.indexOf('PASTE_YOUR') === 0) {
    throw new Error('The API URL has not been configured yet. Open js/api.js and paste your Apps Script Web App URL.');
  }
  const body = Object.assign({ action, token: Session.token }, payload || {});
  const res = await fetch(API_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight against Apps Script web apps
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok && data.error === 'Session expired. Please log in again.') {
    Session.clear();
    window.location.href = 'index.html';
  }
  return data;
}

function requireLogin(allowedRoles) {
  if (!Session.isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  if (allowedRoles && !allowedRoles.includes(Session.role)) {
    window.location.href = Session.role === 'admin' ? 'admin.html' : 'judge.html';
    return false;
  }
  return true;
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
