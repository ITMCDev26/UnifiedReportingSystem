/* ============================================================
   api.js — thin wrapper around the Google Apps Script Web App.
   Every call is a POST with a text/plain body (JSON string).
   Using text/plain avoids a CORS pre-flight request, which is
   the standard trick for talking to Apps Script from a static
   GitHub Pages site with no server in between.
   ============================================================ */

const API = {
  async _call(action, payload) {
    if (!APP_CONFIG.API_URL || APP_CONFIG.API_URL.includes("PASTE_YOUR")) {
      throw new Error("API_URL is not configured yet — set it in js/config.js");
    }
    const res = await fetch(APP_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: Auth.getToken(), ...payload })
    });
    if (!res.ok) throw new Error("Network error (" + res.status + ")");
    const data = await res.json();
    if (data.ok === false) throw new Error(data.error || "Request failed");
    return data.result;
  },

  login(username, password) {
    return this._call("login", { username, password });
  },
  getConfig() {
    return this._call("getConfig", {});
  },
  listReports(filters) {
    return this._call("listReports", { filters });
  },
  getReport(type, id) {
    return this._call("getReport", { type, id });
  },
  createInitialReport(data) {
    return this._call("createInitialReport", { data });
  },
  createProgressReport(data) {
    return this._call("createProgressReport", { data });
  },
  createInformationReport(data) {
    return this._call("createInformationReport", { data });
  },
  updateReport(type, id, data) {
    return this._call("updateReport", { type, id, data });
  },
  adminUpdateConfig(configData) {
    return this._call("adminUpdateConfig", { configData });
  },
  adminUpdateTownships(townships) {
    return this._call("adminUpdateTownships", { townships });
  },
  adminListUsers() {
    return this._call("adminListUsers", {});
  },
  adminUpsertUser(user) {
    return this._call("adminUpsertUser", { user });
  },
  dashboardSummary() {
    return this._call("dashboardSummary", {});
  }
};
