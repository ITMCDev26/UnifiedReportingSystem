/* admin.js — Super Admin: manage operator accounts + edit form content + townships */
const Admin = {
  async init() {
    Auth.requireLogin();
    if (!Auth.isAdmin()) { window.location.href = "dashboard.html"; return; }
    AppShell.mount("admin");
    await this.loadConfig();  // populates this.cfg (incl. live townships) before the account form needs it
    await this.loadUsers();
    this.renderTownships();
    document.getElementById("addUserForm").addEventListener("submit", (e) => this.saveUser(e));
    document.getElementById("configForm").addEventListener("submit", (e) => this.saveConfig(e));
    document.getElementById("townshipsForm").addEventListener("submit", (e) => this.saveTownships(e));
    document.getElementById("addTownshipBtn").addEventListener("click", () => this.addTownshipRow());
  },

  async loadUsers() {
    try {
      this.users = await API.adminListUsers();
    } catch (e) { Toast.show(e.message, true); this.users = []; }
    const roleLabels = { admin: "admin", rsm: "RSM", operator: "operator" };
    const pillFor = (role) => {
      const r = String(role || "").trim().toLowerCase();
      return r === "admin" ? "pill-red" : r === "rsm" ? "pill-orange" : "pill-blue";
    };
    const tbody = document.getElementById("usersBody");
    tbody.innerHTML = this.users.map(u => `
      <tr>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.fullName) || ""}</td>
        <td>${escapeHtml(u.township)}</td>
        <td><span class="pill ${pillFor(u.role)}">${escapeHtml(roleLabels[String(u.role || "").trim().toLowerCase()] || u.role)}</span></td>
        <td><button class="btn btn-ghost" style="padding:6px 10px;" onclick="Admin.editUserByUsername('${String(u.username).replace(/'/g, "\\'")}')">Edit</button></td>
      </tr>`).join("") || `<tr><td colspan="5" class="text-muted">No accounts yet.</td></tr>`;

    const townships = (this.cfg && this.cfg.townships) || APP_CONFIG.townships;
    const twSelect = document.getElementById("u_township");
    twSelect.innerHTML = '<option value="ALL">ALL (Admin / RSM)</option>' +
      townships.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join("");
  },

  editUserByUsername(username) {
    const u = this.users.find(x => String(x.username) === String(username));
    if (!u) { Toast.show("Could not find that account — try refreshing.", true); return; }
    this.editUser(u);
  },

  editUser(u) {
    document.getElementById("u_username").value = u.username;
    document.getElementById("u_username").disabled = true;
    document.getElementById("u_fullName").value = u.fullName || "";
    document.getElementById("u_password").value = "";
    document.getElementById("u_township").value = u.township;
    document.getElementById("u_role").value = u.role;
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async saveUser(e) {
    e.preventDefault();
    const user = {
      username: document.getElementById("u_username").value.trim(),
      fullName: document.getElementById("u_fullName").value.trim(),
      password: document.getElementById("u_password").value,
      township: document.getElementById("u_township").value,
      role: document.getElementById("u_role").value
    };
    try {
      await API.adminUpsertUser(user);
      Toast.show("Account saved: " + user.username);
      document.getElementById("addUserForm").reset();
      document.getElementById("u_username").disabled = false;
      await this.loadUsers();
    } catch (err) { Toast.show(err.message, true); }
  },

  async loadConfig() {
    this.cfg = APP_CONFIG;
    try { this.cfg = (await API.getConfig()) || APP_CONFIG; } catch (e) { /* use fallback */ }
    document.getElementById("cfg_incidentTypes").value = (this.cfg.incidentTypes || []).join("\n");
    document.getElementById("cfg_incidentClassification").value = (this.cfg.incidentClassification || []).join("\n");
    document.getElementById("cfg_weather").value = (this.cfg.weather || []).map(w => w.value || w).join("\n");
  },

  async saveConfig(e) {
    e.preventDefault();
    const configData = {
      incidentTypes: document.getElementById("cfg_incidentTypes").value.split("\n").map(s => s.trim()).filter(Boolean),
      incidentClassification: document.getElementById("cfg_incidentClassification").value.split("\n").map(s => s.trim()).filter(Boolean),
      weather: document.getElementById("cfg_weather").value.split("\n").map(s => s.trim()).filter(Boolean)
    };
    try {
      await API.adminUpdateConfig(configData);
      Toast.show("Form content updated for all operators.");
    } catch (err) { Toast.show(err.message, true); }
  },

  /* ---------------- townships ---------------- */
  renderTownships() {
    const townships = (this.cfg && this.cfg.townships) || APP_CONFIG.townships || [];
    const list = document.getElementById("townshipsList");
    list.innerHTML = "";
    townships.forEach(t => this.addTownshipRow(t.code, t.name, t.code));
  },

  // originalCode is the code this row had when loaded from the server —
  // stored on the row itself and never touched again, so the backend can
  // tell "renamed" apart from "brand new" apart from "deleted" no matter
  // how the admin edits, reorders, adds, or removes rows in this list.
  addTownshipRow(code, name, originalCode) {
    const row = document.createElement("div");
    row.className = "tw-row";
    row.dataset.originalCode = originalCode || "";
    row.innerHTML = `
      <input class="form-control tw-code" placeholder="Code" value="${escapeHtml(code || "")}" maxlength="12">
      <input class="form-control tw-name" placeholder="Full legal name" value="${escapeHtml(name || "")}">
      <button type="button" class="btn-ghost tw-remove" title="Remove this township">✕</button>`;
    row.querySelector(".tw-remove").addEventListener("click", () => row.remove());
    document.getElementById("townshipsList").appendChild(row);
  },

  async saveTownships(e) {
    e.preventDefault();
    const rows = [...document.querySelectorAll("#townshipsList .tw-row")];
    const townships = rows.map(row => ({
      originalCode: row.dataset.originalCode,
      code: row.querySelector(".tw-code").value.trim(),
      name: row.querySelector(".tw-name").value.trim()
    }));
    try {
      const result = await API.adminUpdateTownships(townships);
      let msg = "Townships saved.";
      if (result.renamed) msg += ` ${result.recordsUpdated} existing record(s) updated automatically to match ${result.renamed} rename(s).`;
      Toast.show(msg);
      await this.loadConfig();
      await this.loadUsers();
      this.renderTownships();
      AppShell.refreshTownships(); // so New Report / History / PDF pick up the change without a page reload
    } catch (err) { Toast.show(err.message, true); }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("usersBody")) Admin.init();
});
