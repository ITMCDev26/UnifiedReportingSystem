/* ui.js — toast notifications + Bootstrap modal helper, shared across pages */

// Global safety net: if ANY uncaught error happens anywhere in the app
// (a bad field render, a failed fetch, a typo), surface it as a toast
// instead of leaving the person staring at a button that "does nothing."
window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.error || e.message);
  if (typeof Toast !== "undefined") Toast.show("Something went wrong: " + (e.message || "unknown error"), true);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
  if (typeof Toast !== "undefined") Toast.show("Something went wrong: " + (e.reason && e.reason.message ? e.reason.message : e.reason), true);
});

// Free text (narratives, people's names, admin-configured dropdown
// options) can contain characters like & < > " ' — escape before dropping
// it into innerHTML anywhere, so it never breaks the surrounding markup.
function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Mirrors the backend's sameTownship_/canonicalTownship_ — tolerant of
// stray spacing/casing, and treats a township CODE ("ARCV") as equal to
// its full legal name, since the Users tab can be hand-edited with either.
function sameTownship(a, b) {
  const canon = (v) => {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    const list = (typeof AppShell !== "undefined" && AppShell.townships) || (typeof APP_CONFIG !== "undefined" && APP_CONFIG.townships) || [];
    const byCode = list.find(t => String(t.code).toLowerCase() === s);
    if (byCode) return byCode.name.toLowerCase();
    return s;
  };
  return canon(a) === canon(b);
}

const Toast = {
  show(msg, isError) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = "toast" + (isError ? " error" : "");
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }
};

const Modal = {
  open(innerHTML, opts) {
    this.close();
    const el = document.createElement("div");
    el.className = "modal fade";
    el.id = "activeModal";
    el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">${innerHTML}</div></div>`;
    document.body.appendChild(el);
    this._instance = new bootstrap.Modal(el, { backdrop: (opts && opts.staticBackdrop) ? "static" : true });
    el.addEventListener("hidden.bs.modal", () => el.remove());
    this._instance.show();
  },
  close() {
    const el = document.getElementById("activeModal");
    if (el && this._instance) { this._instance.hide(); }
    else if (el) el.remove();
  }
};

/* Renders the shared app shell (sidebar + topbar + bottom tabs) into any
   authenticated page. Call AppShell.mount('history'|'new'|'admin'|'overview') */
const AppShell = {
  // Static fallback until the live fetch below resolves — every consumer
  // (sameTownship, pdf.js's letterhead code lookup, the Users-account
  // township dropdown) reads AppShell.townships instead of
  // APP_CONFIG.townships directly, so once Admin edits townships in the
  // Sheet, the whole app picks it up without a redeploy.
  townships: APP_CONFIG.townships,

  refreshTownships() {
    return API.getConfig()
      .then(cfg => { if (cfg && Array.isArray(cfg.townships) && cfg.townships.length) AppShell.townships = cfg.townships; })
      .catch(() => {}); // offline/error: keep whatever we already have
  },

  mount(active) {
    Auth.requireLogin();
    this.refreshTownships(); // fire-and-forget; static fallback covers the gap
    const session = Auth.getSession();
    const initials = (session.fullName || session.username || "?").slice(0, 2).toUpperCase();
    const isAdmin = Auth.isAdmin();
    const isRSM = !isAdmin && Auth.canViewAllTownships();
    const roleLabel = isAdmin ? "Super Admin" : (isRSM ? "RSM — All Townships" : session.township);

    const navItems = [
      { key: "overview", href: "dashboard.html#overview", icon: "📊", label: "Overview" },
      { key: "new", href: "new-report.html", icon: "➕", label: "New Report" },
      { key: "history", href: "dashboard.html#history", icon: "🗂️", label: "History" }
    ];
    if (isAdmin) navItems.push({ key: "admin", href: "admin.html", icon: "🛠️", label: "Admin" });

    const navHTML = navItems.map(n =>
      `<a class="nav-item ${n.key === active ? "active" : ""}" href="${n.href}">
        <span class="ic">${n.icon}</span><span>${n.label}</span></a>`).join("");

    document.querySelectorAll("[data-shell='sidebar']").forEach(el => {
      el.innerHTML = `
        <div class="login-brand"><div class="brand-mark">UB</div>
          <div><div class="login-title" style="font-size:15px;">${APP_CONFIG.orgName}</div>
          <div class="text-faint" style="font-size:11px;">Command Center</div></div></div>
        <nav>${navHTML}</nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <div class="user-avatar">${initials}</div>
            <div><div class="user-name">${escapeHtml(session.fullName || session.username)}</div>
            <div class="user-role">${roleLabel}</div></div>
          </div>
          <button class="btn btn-ghost" style="width:100%;margin-top:10px;" onclick="Auth.logout()">Log Out</button>
          <div class="sidebar-status"><span class="status-dot"></span>SYSTEM ONLINE</div>
        </div>`;
    });

    document.querySelectorAll("[data-shell='bottomtabs']").forEach(el => {
      el.innerHTML = navHTML;
    });

    document.querySelectorAll("[data-shell='theme-btn']").forEach(el => {
      el.id = "themeToggle";
    });
  }
};
