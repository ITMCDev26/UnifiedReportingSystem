/* ============================================================
   forms.js — renders Initial / Progress / Information forms
   from FORM_SCHEMAS, handles conditional fields, township
   carousel, icon-choice inputs, autofill/carry-forward between
   linked reports, and submission routing.

   Report linking rules implemented here (see README for full spec):
   - Initial report gets a fresh running number per township:
       <CODE>-IR_001, <CODE>-IR_002, ...   (assigned by the backend)
   - First Progress report on that incident reuses the same number:
       <CODE>-PR_001
     Additional progress updates on the SAME still-open incident:
       <CODE>-PR_001-2, <CODE>-PR_001-3, ...
   - Information report (outside-township, supported cases) starts
     its own counter and always carries a series suffix:
       <CODE>-IP_001-1, then follow-ups <CODE>-IP_001-2, -3, ...
       A new information incident becomes <CODE>-IP_002-1
   - Once a report's "resolved" value is Yes, every report tied to
     that incident number becomes read-only.
   ============================================================ */

const FormPage = {
  qs: new URLSearchParams(window.location.search),
  type: null,          // 'initial' | 'progress' | 'information'
  mode: null,           // 'new' | 'followup' | 'edit'
  refId: null,          // id of the report we're branching from / editing
  config: null,
  prefill: {},
  values: {},
  locked: false,

  async init() {
    Auth.requireLogin();
    this.type = this.qs.get("type") || "";
    this.mode = this.qs.get("mode") || "new";
    this.refId = this.qs.get("ref");

    // Landing on New Report with no type chosen yet (the normal case when
    // clicking "New Report" in the nav) shows the two big choice buttons.
    // Everything else (a type already in the URL, edits, follow-ups,
    // Progress reports launched from an Initial record) goes straight to
    // the form — the chooser is only ever the very first click.
    if (!this.type) {
      this.showChooser();
      return;
    }
    document.getElementById("reportChooser").classList.add("hidden");
    document.getElementById("formCardWrap").classList.remove("hidden");
    await this.loadForm();
  },

  showChooser() {
    document.getElementById("formTitle").textContent = "New Report";
    document.getElementById("reportChooser").classList.remove("hidden");
    document.getElementById("formCardWrap").classList.add("hidden");
    document.querySelectorAll("#reportChooser [data-choose-type]").forEach(card => {
      const choose = () => {
        const type = card.dataset.chooseType;
        history.replaceState(null, "", `new-report.html?type=${type}&mode=new`);
        this.type = type; this.mode = "new";
        document.getElementById("reportChooser").classList.add("hidden");
        const wrap = document.getElementById("formCardWrap");
        wrap.classList.remove("hidden");
        wrap.classList.add("flash-in");
        this.loadForm();
      };
      card.addEventListener("click", choose);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      });
    });
  },

  async loadForm() {
    document.getElementById("formTitle").textContent = this.titleFor(this.type, this.mode);

    try {
      const apiConfig = await API.getConfig();
      // Merge with the static fallback so that if the Sheet's Config tab is
      // ever missing/empty for a category (e.g. Weather), the form still
      // renders working options instead of a blank, unclickable group.
      this.config = this.mergeConfig(APP_CONFIG, apiConfig);
    } catch (e) {
      this.config = APP_CONFIG; // fully offline fallback so the form still renders
    }

    if (this.refId) {
      try {
        const ref = await API.getReport(this.refTypeFor(), this.refId);
        this.applyCarryForward(ref);
        if (this.mode === "edit") {
          this.values = { ...ref };
          this.locked = ref.resolved === "Yes";
        }
      } catch (e) {
        Toast.show("Could not load the source report: " + e.message, true);
      }
    }

    const session = Auth.getSession();
    // Always the current operator, in every mode (new, follow-up, or
    // edit) — the backend re-applies this on save regardless of what's
    // shown here, so the form should never suggest it's editable or that
    // it belongs to whoever originally filed the record.
    this.values.reportedBy = session.fullName || session.username;
    if (!this.values.township && session.township && session.township !== "ALL") {
      this.values.township = session.township;
    }

    this.render();
  },

  titleFor(type, mode) {
    const names = { initial: "Initial Report", progress: "Progress Report", information: "Information Report" };
    if (mode === "edit") return "Edit " + names[type];
    if (mode === "followup") return "New Update — " + names[type];
    return "New " + names[type];
  },

  // Combines the local fallback config with whatever the backend returned,
  // preferring the backend's list for a category ONLY if it actually has
  // entries. This is what stops a single empty/misconfigured category
  // (like Weather) from rendering as an empty, non-clickable group.
  mergeConfig(fallback, apiConfig) {
    const merged = { ...fallback, ...(apiConfig || {}) };
    ["incidentTypes", "incidentClassification", "weather", "alertLevels", "townships", "incidentCategory"].forEach(key => {
      const apiVal = apiConfig ? apiConfig[key] : null;
      if (!apiVal || !Array.isArray(apiVal) || apiVal.length === 0) merged[key] = fallback[key];
    });
    return merged;
  },

  refTypeFor() {
    // the report we branch FROM: initial->progress uses 'initial', a follow-up uses same type
    return this.type === "progress" && this.mode === "new" ? "initial" : this.type;
  },

  applyCarryForward(ref) {
    const carryList = (this.type === "progress" && this.mode === "new")
      ? CARRY_FROM_INITIAL_TO_PROGRESS
      : CARRY_FROM_PREVIOUS_SERIES;
    carryList.forEach(k => { if (ref[k] !== undefined) this.values[k] = ref[k]; });

    if (this.type === "progress" && this.mode === "followup") {
      // ref here is a PREVIOUS PROGRESS row, which already points back at
      // the original Initial report via its own linkId — reuse that so the
      // backend keeps counting updates under the same incident thread.
      this.values._linkId = ref.linkId;
    } else {
      // initial->progress (ref.id is the Initial report's own id), or an
      // information follow-up (ref.id is the previous entry in the series).
      this.values._linkId = ref.id;
    }
    this.values._linkTownship = ref.township;
  },

  render() {
    const root = document.getElementById("formRoot");
    root.innerHTML = "";
    root.className = "row g-3"; // Bootstrap grid — replaces the old hand-rolled CSS grid
    document.getElementById("lockedBanner").classList.toggle("hidden", !this.locked);

    const fieldKeys = FORM_SCHEMAS[this.type];
    fieldKeys.forEach(key => {
      const field = FIELD_LIBRARY[key];
      if (!field) return;
      // A problem rendering ONE field (bad config data, etc.) must never
      // stop the rest of the form — or worse, stop the Submit button from
      // ever getting wired up, which looks exactly like "nothing happens."
      try {
        root.appendChild(this.renderField(field));
      } catch (err) {
        console.error("Failed to render field " + key + ":", err);
        Toast.show(`Couldn't load the "${field.label}" field — try refreshing.`, true);
      }
    });

    document.getElementById("submitBtn").disabled = this.locked;
    document.getElementById("submitBtn").onclick = () => this.submit();
    this.wireConditionals();
  },

  // Bootstrap column classes: full-width widgets (textarea, township
  // carousel, icon-choice, yes/no) always take the full row; simple
  // inputs sit two-per-row on tablet/desktop and stack on phones.
  fieldWrap(field, inner) {
    const fullWidth = ["textarea", "township-carousel", "icon-choice", "yesno"].includes(field.type);
    const col = document.createElement("div");
    col.className = fullWidth ? "col-12" : "col-12 col-md-6";
    col.dataset.key = field.key;
    if (field.showIf) col.dataset.showIf = JSON.stringify(field.showIf);
    const label = document.createElement("label");
    label.className = "form-label fw-semibold small text-uppercase";
    label.style.color = "var(--text-muted)";
    label.style.letterSpacing = ".03em";
    label.innerHTML = field.label + (field.required ? ' <span class="required-mark">*</span>' : "");
    col.appendChild(label);
    col.appendChild(inner);
    return col;
  },

  renderField(field) {
    const disabled = this.locked ? "disabled" : "";
    const val = this.values[field.key] ?? "";

    if (field.type === "select") {
      const sel = document.createElement("select");
      sel.className = "form-select";
      sel.id = "f_" + field.key; sel.disabled = this.locked;
      sel.innerHTML = '<option value="">Select…</option>' +
        (this.config[field.optionsFrom] || []).map(opt =>
          `<option value="${opt}" ${opt === val ? "selected" : ""}>${opt}</option>`).join("");
      sel.addEventListener("change", () => this.wireConditionals());
      return this.fieldWrap(field, sel);
    }

    if (field.type === "text") {
      const inp = document.createElement("input");
      inp.className = "form-control";
      inp.type = "text"; inp.id = "f_" + field.key; inp.value = val; inp.disabled = this.locked;
      return this.fieldWrap(field, inp);
    }

    if (field.type === "readonly") {
      // Locked, backend-sourced field (e.g. Reported By). Rendered as a
      // disabled input so it still submits with the form and looks
      // obviously non-editable, plus a small note explaining why.
      const inp = document.createElement("input");
      inp.className = "form-control readonly-field";
      inp.type = "text"; inp.id = "f_" + field.key; inp.value = val;
      inp.disabled = true; inp.readOnly = true;
      const wrap = document.createElement("div");
      wrap.appendChild(inp);
      const note = document.createElement("div");
      note.className = "text-faint";
      note.style.fontSize = "11px"; note.style.marginTop = "5px";
      note.textContent = "🔒 Locked to your account on file — cannot be edited.";
      wrap.appendChild(note);
      return this.fieldWrap(field, wrap);
    }

    if (field.type === "date") {
      const inp = document.createElement("input");
      inp.className = "form-control";
      inp.type = "date"; inp.id = "f_" + field.key;
      inp.value = val || new Date().toISOString().slice(0, 10);
      inp.disabled = this.locked;
      return this.fieldWrap(field, inp);
    }

    if (field.type === "time") {
      const inp = document.createElement("input");
      inp.className = "form-control";
      inp.type = "time"; inp.id = "f_" + field.key; inp.value = val; inp.disabled = this.locked;
      return this.fieldWrap(field, inp);
    }

    if (field.type === "textarea") {
      const ta = document.createElement("textarea");
      ta.className = "form-control";
      ta.id = "f_" + field.key; ta.value = val; ta.disabled = this.locked;
      ta.rows = 3;
      return this.fieldWrap(field, ta);
    }

    if (field.type === "icon-choice") {
      const group = document.createElement("div");
      group.className = "icon-choice-group";
      group.id = "f_" + field.key;
      (this.config[field.optionsFrom] || []).forEach(opt => {
        const value = opt.value || opt;
        const icon = opt.icon || "";
        const cls = opt.className || "";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "icon-choice" + (value === val ? (" selected" + (cls ? " " + cls : "")) : "");
        btn.dataset.value = value; btn.dataset.cls = cls;
        btn.innerHTML = `<span class="ic">${icon}</span> ${opt.label || value}`;
        if (!this.locked) {
          btn.addEventListener("click", () => {
            // classList.add()/remove() throw if given an empty string, and
            // weather options have no className (cls === "") — guard every
            // call so a click always registers instead of silently failing.
            [...group.children].forEach(c => {
              c.classList.remove("selected");
              if (c.dataset.cls) c.classList.remove(c.dataset.cls);
            });
            btn.classList.add("selected");
            if (cls) btn.classList.add(cls);
            group.dataset.value = value;
          });
        } else btn.disabled = true;
        group.appendChild(btn);
      });
      group.dataset.value = val;
      return this.fieldWrap(field, group);
    }

    if (field.type === "yesno") {
      const group = document.createElement("div");
      group.className = "yesno-group icon-choice-group";
      group.id = "f_" + field.key;
      [{ v: "No", ic: "🟠" }, { v: "Yes", ic: "✅" }].forEach(o => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "icon-choice" + (o.v === val ? " selected" : "");
        btn.innerHTML = `<span class="ic">${o.ic}</span> ${o.v}`;
        btn.dataset.value = o.v;
        if (!this.locked) {
          btn.addEventListener("click", () => {
            [...group.children].forEach(c => c.classList.remove("selected"));
            btn.classList.add("selected");
            group.dataset.value = o.v;
          });
        } else btn.disabled = true;
        group.appendChild(btn);
      });
      group.dataset.value = val || "No";
      return this.fieldWrap(field, group);
    }

    if (field.type === "township-carousel") {
      const wrap = document.createElement("div");
      wrap.className = "township-carousel";
      wrap.id = "f_" + field.key;
      (this.config.townships || []).forEach(t => {
        const card = document.createElement("div");
        card.className = "township-card" + (t.name === val ? " selected" : "");
        card.dataset.value = t.name; card.dataset.code = t.code;
        card.innerHTML = `<div class="township-logo">${t.code.slice(0, 2)}</div>
          <div class="township-name">${t.name}</div><div class="township-code">${t.code}</div>`;
        if (!this.locked) {
          card.addEventListener("click", () => {
            [...wrap.children].forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            wrap.dataset.value = t.name; wrap.dataset.code = t.code;
          });
        }
        wrap.appendChild(card);
      });
      const selected = (this.config.townships || []).find(t => t.name === val);
      if (selected) wrap.dataset.code = selected.code;
      wrap.dataset.value = val;
      return this.fieldWrap(field, wrap);
    }

    const fallback = document.createElement("input");
    fallback.id = "f_" + field.key; fallback.value = val;
    return this.fieldWrap(field, fallback);
  },

  wireConditionals() {
    document.querySelectorAll("[data-show-if]").forEach(wrap => {
      const cond = JSON.parse(wrap.dataset.showIf);
      const sourceEl = document.getElementById("f_" + cond.field);
      const sourceVal = sourceEl ? sourceEl.value : null;
      wrap.classList.toggle("hidden", sourceVal !== cond.equals);
    });
  },

  collect() {
    const data = {};
    FORM_SCHEMAS[this.type].forEach(key => {
      const field = FIELD_LIBRARY[key];
      const el = document.getElementById("f_" + key);
      if (!el) return;
      if (["icon-choice", "yesno", "township-carousel"].includes(field.type)) {
        data[key] = el.dataset.value || "";
      } else {
        data[key] = el.value || "";
      }
    });
    if (this.values._linkId) data._linkId = this.values._linkId;
    return data;
  },

  validate(data) {
    // clear any previous invalid highlighting
    document.querySelectorAll(".is-invalid-field").forEach(el => el.classList.remove("is-invalid-field"));

    for (const key of FORM_SCHEMAS[this.type]) {
      const field = FIELD_LIBRARY[key];
      if (field.showIf) {
        const parentVal = data[field.showIf.field];
        if (parentVal !== field.showIf.equals) continue;
      }
      if (field.required && !data[key]) {
        const col = document.querySelector(`[data-key="${key}"]`);
        if (col) {
          col.classList.add("is-invalid-field");
          col.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        Toast.show(`"${field.label}" is required.`, true);
        return false;
      }
    }
    return true;
  },

  // Blank out every field so the operator sees a clean form and can start
  // a fresh report immediately, or simply see that the submit went through.
  resetForm() {
    FORM_SCHEMAS[this.type].forEach(key => {
      const field = FIELD_LIBRARY[key];
      const el = document.getElementById("f_" + key);
      if (!el) return;
      if (field.type === "select") { el.value = ""; }
      else if (field.type === "text" || field.type === "textarea") { el.value = ""; }
      else if (field.type === "date") { el.value = new Date().toISOString().slice(0, 10); }
      else if (field.type === "time") { el.value = ""; }
      else if (["icon-choice", "yesno", "township-carousel"].includes(field.type)) {
        el.dataset.value = "";
        [...el.children].forEach(c => {
          c.classList.remove("selected");
          if (c.dataset && c.dataset.cls) c.classList.remove(c.dataset.cls);
        });
      }
    });
    this.wireConditionals();
  },

  async submit() {
    const data = this.collect();
    if (!this.validate(data)) return;
    const btn = document.getElementById("submitBtn");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      let result, verb;
      if (this.mode === "edit") {
        result = await API.updateReport(this.type, this.refId, data);
        verb = "updated";
      } else if (this.type === "initial") {
        result = await API.createInitialReport(data);
        verb = "filed";
      } else if (this.type === "progress") {
        result = await API.createProgressReport(data);
        verb = "filed";
      } else {
        result = await API.createInformationReport(data);
        verb = "filed";
      }
      // The backend returns the full saved record (not just an id) so we
      // can offer an immediate print / save-as-PDF right after submitting.
      const fullReport = (result && result.id && result.type) ? result : { ...data, id: result.id, type: this.type };

      if (this.mode !== "edit") this.resetForm(); // fresh form for the next report
      btn.textContent = "Submit Report";
      btn.disabled = false;
      this.showSuccess(fullReport, verb);
    } catch (e) {
      Toast.show(e.message || "Submission failed — the report was NOT saved.", true);
      btn.disabled = false; btn.textContent = "Submit Report";
    }
  },

  showSuccess(report, verb) {
    Toast.show(`Report ${verb}: ${report.id} — saved to Sheets & Telegram.`);
    const html = `
      <div class="modal-header">
        <h5 class="modal-title"><span class="celebrate-emoji">🎉</span> Report ${verb}!</h5>
        <button type="button" class="btn-close" onclick="Modal.close()"></button>
      </div>
      <div class="modal-body text-center py-4">
        <div class="mb-2 text-muted">Reference code</div>
        <div class="code-chip" style="font-size:16px;padding:8px 16px;">${report.id}</div>
        <p class="text-muted mt-3 mb-0">Saved to the Sheet and posted to Telegram. It's already in Report History.</p>
        <p class="text-faint mt-2 mb-0" id="autoRedirectNote" style="font-size:12px;">Returning to Report History in <span id="autoRedirectSecs">6</span>s…</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" onclick="FormPage.cancelAutoRedirect(); Modal.close(); window.location.href='dashboard.html#history';">Go to History Now</button>
        <button class="btn btn-primary" onclick="FormPage.cancelAutoRedirect(); ReportPrint.preview(${JSON.stringify(report).replace(/'/g, "&#39;")}, '${report.type}')">🖨️ Print / Save as PDF</button>
      </div>`;
    Modal.open(html, { staticBackdrop: true });

    // Auto-return to History after a few seconds so a filed report is
    // never left "hanging" on screen — cancelled if the operator clicks
    // Print (they're clearly still working with this report) or navigates
    // away manually first.
    let secs = 6;
    this._redirectTimer = setInterval(() => {
      secs -= 1;
      const el = document.getElementById("autoRedirectSecs");
      if (el) el.textContent = secs;
      if (secs <= 0) {
        this.cancelAutoRedirect();
        window.location.href = "dashboard.html#history";
      }
    }, 1000);
  },

  cancelAutoRedirect() {
    if (this._redirectTimer) { clearInterval(this._redirectTimer); this._redirectTimer = null; }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("formRoot")) FormPage.init();
});
