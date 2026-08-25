/* pdf.js — builds a print-friendly, formal-letterhead preview of a report
   and triggers the browser's native "Save as PDF" via window.print(). No
   external library needed, keeping the whole app dependency-free. */
const ReportPrint = {
  labelFor(key) {
    return (FIELD_LIBRARY[key] && FIELD_LIBRARY[key].label) || key;
  },

  esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  townshipCode(name) {
    const list = (typeof AppShell !== "undefined" && AppShell.townships) || APP_CONFIG.townships || [];
    const t = list.find(t => t.name === name);
    return t ? t.code : (name || "—");
  },

  // "17 Jul 2026" / "08:03" — matches the reference letterhead's date
  // format. Timezone label is fixed to UTC+8 (Philippine Standard Time,
  // which every configured township operates in).
  fmtDate(d) { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); },
  fmtTime(d) { return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }); },

  buildRows(report, type) {
    // Date + Time of Incident are combined into a single "Date/Time" row
    // up top (matching the letterhead reference), so they're skipped in
    // the generic field loop below to avoid repeating them. Township is
    // already represented in the letterhead subtitle.
    const skip = ["township", "date", "timeOfIncident"];
    const keys = (FORM_SCHEMAS[type] || Object.keys(report)).filter(k => skip.indexOf(k) === -1);
    const dateTimeRow = (report.date || report.timeOfIncident)
      ? `<div class="pr-row"><div class="pr-label">Date/Time</div>
          <div class="pr-value">${this.esc(report.date)}${report.date && report.timeOfIncident ? " / " : ""}${this.esc(report.timeOfIncident)}</div></div>`
      : "";
    const rest = keys
      .filter(k => report[k] !== undefined && report[k] !== "")
      .map(k => `<div class="pr-row"><div class="pr-label">${this.esc(this.labelFor(k))}</div>
        <div class="pr-value">${this.esc(report[k])}</div></div>`)
      .join("");
    return dateTimeRow + rest;
  },

  preview(report, type) {
    const title = { initial: "Initial Report", progress: "Progress Report", information: "Information Report" }[type];
    const now = new Date();
    const genDate = this.fmtDate(now), genTime = this.fmtTime(now);
    const code = this.townshipCode(report.township);
    const html = `
      <div class="modal-header">
        <h5 class="modal-title">Report Preview</h5>
        <button type="button" class="btn-close" onclick="Modal.close()"></button>
      </div>
      <div class="modal-body">
        <div id="printArea" class="print-sheet">
          <div class="pr-letterhead">
            <div class="pr-lh-left">
              <div class="pr-org">${this.esc(APP_CONFIG.orgName)}</div>
              <div class="pr-orgsub">${this.esc(code)} Command Center Report System</div>
              <div class="pr-orgsub">Operations Center</div>
            </div>
            <div class="pr-lh-right">
              <div>Ref ${this.esc(report.id)}</div>
              <div>Generated ${genDate}</div>
              <div>${genTime} (UTC+8)</div>
            </div>
          </div>
          <h1 class="pr-title">${title}</h1>
          <div class="pr-body">
            ${this.buildRows(report, type)}
          </div>
          <div class="pr-footer">
            <div class="pr-footerrow">
              <span>${this.esc(APP_CONFIG.orgName)} Command Center Report System</span>
              <span>Ref ${this.esc(report.id)} · Printed ${genDate} ${genTime} · Page 1</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" onclick="Modal.close()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>`;
    Modal.open(html);
  }
};
