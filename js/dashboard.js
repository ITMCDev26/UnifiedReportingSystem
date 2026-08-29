/* dashboard.js — Overview stats + Report History table */
const Dashboard = {
  reports: [],
  session: null,

  async init() {
    Auth.requireLogin();
    this.session = Auth.getSession();
    AppShell.mount(location.hash === "#overview" || !location.hash ? "overview" : "history");
    this.route();
    window.addEventListener("hashchange", () => this.route());
    await this.refresh(false);
  },

  async refresh(announce) {
    try {
      this.reports = await API.listReports({}) || [];
      this.lastError = null;
      if (announce) Toast.show(`Refreshed — ${this.reports.length} report(s) loaded.`);
    } catch (e) {
      this.lastError = e.message || "Unknown error";
      Toast.show("Could not load reports: " + this.lastError, true);
      this.reports = this.reports || [];
    }
    this.renderOverview();
    this.renderHistory();
    this.checkOpenCaseReminder();
  },

  route() {
    const isHistory = location.hash === "#history";
    document.getElementById("overviewPage").classList.toggle("hidden", isHistory);
    document.getElementById("historyPage").classList.toggle("hidden", !isHistory);
    document.querySelectorAll("[data-shell] .nav-item").forEach(a => a.classList.remove("active"));
  },

  renderOverview() {
    const total = this.reports.length;
    const open = this.reports.filter(r => r.resolved !== "Yes").length;
    const overdue = this.reports.filter(r => r.type === "initial" && r.resolved !== "Yes" && this.isOverdue(r)).length;
    const today = new Date().toISOString().slice(0, 10);
    const filedToday = this.reports.filter(r => r.date === today).length;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statOpen").textContent = open;
    document.getElementById("statOverdue").textContent = overdue;
    document.getElementById("statToday").textContent = filedToday;

    // per-township breakdown (super admin sees all townships)
    const byTownship = {};
    this.reports.forEach(r => {
      byTownship[r.township] = byTownship[r.township] || { total: 0, open: 0 };
      byTownship[r.township].total++;
      if (r.resolved !== "Yes") byTownship[r.township].open++;
    });
    const list = document.getElementById("townshipBreakdown");
    if (list) {
      list.innerHTML = Object.entries(byTownship)
        .sort((a, b) => b[1].open - a[1].open)
        .map(([name, v]) => `
          <div class="col-12 col-md-6">
            <div class="card d-flex flex-row justify-content-between align-items-center">
              <div><div style="font-weight:600;font-size:13.5px;">${escapeHtml(name)}</div>
              <div class="text-faint" style="font-size:11.5px;">${v.total} total reports</div></div>
              <div class="pill ${v.open > 0 ? "pill-red" : "pill-blue"}">${v.open} open</div>
            </div>
          </div>`).join("") || `<p class="text-muted">No reports yet.</p>`;
    }
  },

  // An Initial report counts as "overdue" once it has been open 12+ hours
  // without being marked resolved — this mirrors the 12-hour email alert
  // the backend sends to megar.global@megaworldcorp.com.
  isOverdue(r) {
    if (!r.createdAt) return false;
    const ageMs = Date.now() - new Date(r.createdAt).getTime();
    return ageMs >= 12 * 60 * 60 * 1000;
  },

  renderHistory() {
    const typeFilter = document.getElementById("filterType").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const search = (document.getElementById("filterSearch").value || "").toLowerCase();

    let rows = this.reports.filter(r => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (statusFilter === "open" && r.resolved === "Yes") return false;
      if (statusFilter === "resolved" && r.resolved !== "Yes") return false;
      if (search && !(`${r.id} ${r.typeOfIncident} ${r.township} ${r.reportedBy}`.toLowerCase().includes(search))) return false;
      return true;
    });
    rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const tbody = document.getElementById("historyBody");
    tbody.innerHTML = rows.map(r => this.rowHTML(r)).join("") ||
      `<tr><td colspan="7" class="text-muted" style="padding:24px;text-align:center;">No reports found.</td></tr>`;
  },

  rowHTML(r) {
    const statusHTML = r.resolved === "Yes"
      ? `<span class="status resolved"><span class="dot"></span>Resolved</span>`
      : `<span class="status ongoing"><span class="dot"></span>Ongoing</span>`;
    const alertPill = { Red: "pill-red", Yellow: "pill-yellow", Blue: "pill-blue" }[r.alertLevel] || "pill-blue";
    const canEdit = r.resolved !== "Yes" && (Auth.canViewAllTownships() || sameTownship(r.township, this.session.township));
    const overdueBadge = (r.type === "initial" && r.resolved !== "Yes" && this.isOverdue(r))
      ? ` <span class="pill pill-orange" title="Open 12+ hours">⚠ 12h+</span>` : "";

    let actions = `<button title="Preview / Print" onclick="Dashboard.previewById('${r.type}','${String(r.id).replace(/'/g, "\\'")}')">🖨️</button>`;
    if (canEdit) {
      actions += `<button title="Edit" onclick="location.href='new-report.html?type=${r.type}&mode=edit&ref=${encodeURIComponent(r.id)}'">✏️</button>`;
    }
    if (r.type === "initial" && r.resolved !== "Yes") {
      actions += `<button title="Start Progress Report on this incident" onclick="location.href='new-report.html?type=progress&mode=new&ref=${encodeURIComponent(r.id)}'">➡️</button>`;
    }
    if (r.type === "progress" && r.resolved !== "Yes") {
      actions += `<button title="Add another Progress Update to this incident" onclick="location.href='new-report.html?type=progress&mode=followup&ref=${encodeURIComponent(r.id)}'">🔄</button>`;
    }
    if (r.type === "information" && r.resolved !== "Yes") {
      actions += `<button title="Send another Information Report on this thread" onclick="location.href='new-report.html?type=information&mode=followup&ref=${encodeURIComponent(r.id)}'">📨</button>`;
    }
    // Once resolved, none of the above render — the thread is closed and
    // no further Progress/Information updates can be generated from it.

    return `<tr>
      <td><span class="code-chip">${escapeHtml(r.id)}</span>${overdueBadge}</td>
      <td>${escapeHtml(r.typeOfIncident) || "—"}</td>
      <td><span class="pill ${alertPill}">${escapeHtml(r.alertLevel) || "—"}</span></td>
      <td>${escapeHtml(r.township) || "—"}</td>
      <td>${escapeHtml(r.date) || "—"}</td>
      <td>${statusHTML}</td>
      <td><div class="row-actions">${actions}</div></td>
    </tr>`;
  },

  preview(report) {
    ReportPrint.preview(report, report.type);
  },

  previewById(type, id) {
    const r = this.reports.find(x => x.type === type && String(x.id) === String(id));
    if (!r) { Toast.show("Could not find that report — try refreshing.", true); return; }
    this.preview(r);
  },

  checkOpenCaseReminder() {
    const open = this.reports.filter(r => r.resolved !== "Yes" &&
      (Auth.canViewAllTownships() || sameTownship(r.township, this.session.township)));
    const hour = new Date().getHours();
    const banner = document.getElementById("openCaseBanner");
    if (!banner) return;
    if (hour >= 18 && open.length > 0) {
      banner.classList.remove("hidden");
      banner.textContent = `⏰ End-of-day check: you still have ${open.length} open case(s) not yet marked resolved.`;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Open cases pending", { body: `${open.length} case(s) still open past 6:00 PM.` });
      }
    } else {
      banner.classList.add("hidden");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("historyBody")) Dashboard.init();
});
