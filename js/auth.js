/* auth.js — login/session handling (session stored in localStorage) */
const Auth = {
  KEY: "ubcc_session",

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; }
  },
  getToken() {
    const s = this.getSession();
    return s ? s.token : null;
  },
  isLoggedIn() {
    return !!this.getSession();
  },
  isAdmin() {
    const s = this.getSession();
    return s && String(s.role || "").trim().toLowerCase() === "admin";
  },
  // RSM: same cross-township read/edit access as Admin (History,
  // Dashboard, editing any township's reports) but NOT the Admin page
  // itself — account creation and Form Content editing stay admin-only.
  canViewAllTownships() {
    const s = this.getSession();
    const role = s && String(s.role || "").trim().toLowerCase();
    return role === "admin" || role === "rsm";
  },
  setSession(session) {
    localStorage.setItem(this.KEY, JSON.stringify(session));
  },
  logout() {
    localStorage.removeItem(this.KEY);
    window.location.href = "index.html";
  },
  requireLogin() {
    if (!this.isLoggedIn()) window.location.href = "index.html";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const errBox = document.getElementById("loginError");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.classList.add("hidden");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      // session = { token, username, fullName, role, township }
      const session = await API.login(username, password);
      Auth.setSession(session);
      window.location.href = "dashboard.html";
    } catch (err) {
      errBox.textContent = err.message || "Invalid username or password.";
      errBox.classList.remove("hidden");
    } finally {
      btn.disabled = false; btn.textContent = "Sign In";
    }
  });
});
