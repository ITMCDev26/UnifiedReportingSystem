/* admin.js — Super Admin: manage operator accounts + edit form content */
const Admin = {
  async init() {
    Auth.requireLogin();
    if (!Auth.isAdmin()) { window.location.href = "dashboard.html"; return; }
    AppShell.mount("admin");
    await this.loadUsers();
    await this.loadConfig();
    document.getElementById("addUserForm").addEventListener("submit", (e) => this.saveUser(e));
    document.getElementById("configForm").addEventListener("submit", (e) => this.saveConfig(e));
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

    const twSelect = document.getElementById("u_township");
    twSelect.innerHTML = '<option value="ALL">ALL (Admin / RSM)</option>' +
      APP_CONFIG.townships.map(t => `<option value="${t.name}">${escapeHtml(t.name)}</option>`).join("");
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
    let cfg = APP_CONFIG;
    try { cfg = (await API.getConfig()) || APP_CONFIG; } catch (e) { /* use fallback */ }
    document.getElementById("cfg_incidentTypes").value = (cfg.incidentTypes || []).join("\n");
    document.getElementById("cfg_incidentClassification").value = (cfg.incidentClassification || []).join("\n");
    document.getElementById("cfg_weather").value = (cfg.weather || []).map(w => w.value || w).join("\n");
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
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("usersBody")) Admin.init();
});
