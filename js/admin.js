requireLogin(['admin']);

const bunting = document.getElementById('bunting');
for (let i = 0; i < 40; i++) bunting.appendChild(document.createElement('span'));
document.getElementById('whoami').textContent = Session.displayName + ' (Admin)';
document.getElementById('logoutBtn').onclick = async () => {
  await apiCall('logout', {});
  Session.clear();
  window.location.href = 'index.html';
};

let categories = [], criteria = [], participants = [], judges = [];
let activeTab = 'categories';
let pickedCategory = { criteria: null, participants: null, summary: null, results: null };

async function loadAll() {
  const boot = await apiCall('bootstrap', {});
  if (!boot.ok) return alert(boot.error);
  categories = boot.categories; criteria = boot.criteria; participants = boot.participants;
  const jr = await apiCall('listJudges', {});
  if (jr.ok) judges = jr.judges;
}

document.querySelectorAll('#tabbar button').forEach(btn => {
  btn.onclick = () => { switchTab(btn.dataset.tab); };
});

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

function categorySelector(pickedKey, onChange) {
  if (!categories.length) return `<div class="empty-state"><span class="big-emoji">📋</span><h3>Add a category first</h3><p>Go to the Categories tab to create one.</p></div>`;
  if (!pickedCategory[pickedKey]) pickedCategory[pickedKey] = categories[0].categoryId;
  return `
    <div class="field" style="max-width:320px">
      <label>Category</label>
      <select id="catSelect-${pickedKey}">
        ${categories.map(c => `<option value="${c.categoryId}" ${c.categoryId === pickedCategory[pickedKey] ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>`;
}
function bindCategorySelector(pickedKey, onChange) {
  const sel = document.getElementById('catSelect-' + pickedKey);
  if (sel) sel.onchange = () => { pickedCategory[pickedKey] = sel.value; onChange(); };
}

async function render() {
  const el = document.getElementById('tabContent');
  if (activeTab === 'categories') return renderCategories(el);
  if (activeTab === 'criteria') return renderCriteria(el);
  if (activeTab === 'participants') return renderParticipants(el);
  if (activeTab === 'judges') return renderJudges(el);
  if (activeTab === 'summary') return renderSummary(el);
  if (activeTab === 'results') return renderResultsTab(el);
}

/* ---------------- CATEGORIES ---------------- */
function renderCategories(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Judging Categories</div>
      ${categories.length ? `<table><thead><tr><th>Name</th><th>Status</th><th></th></tr></thead><tbody>
        ${categories.map(c => `<tr>
          <td><input class="cat-name-input" data-id="${c.categoryId}" value="${escapeHtml(c.name)}"></td>
          <td>${String(c.released) === 'true' ? '<span class="pill released">Released</span>' : (String(c.computed) === 'true' ? '<span class="pill locked">Computed</span>' : '<span class="pill open">Open</span>')}</td>
          <td><button class="btn-outline btn-sm save-cat" data-id="${c.categoryId}">Save</button></td>
        </tr>`).join('')}
      </tbody></table>` : `<div class="empty-state"><span class="big-emoji">📋</span><h3>No categories yet</h3><p>Add your first one below — e.g. Bible Bee, Singing Bee, Art.</p></div>`}
    </div>
    <div class="card">
      <div class="ribbon-badge green">Add New Category</div>
      <div class="grid-2">
        <div class="field"><label>Category Name</label><input id="newCatName" placeholder="e.g. Bible Bee"></div>
      </div>
      <button class="btn-primary" id="addCatBtn">＋ Add Category</button>
      <div id="catMsg"></div>
    </div>`;

  el.querySelectorAll('.save-cat').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    const val = el.querySelector(`.cat-name-input[data-id="${id}"]`).value.trim();
    if (!val) return alert('Name cannot be empty.');
    const res = await apiCall('editCategory', { categoryId: id, name: val });
    if (!res.ok) return alert(res.error);
    await loadAll(); render();
  });

  document.getElementById('addCatBtn').onclick = async () => {
    const name = document.getElementById('newCatName').value.trim();
    const msg = document.getElementById('catMsg');
    if (!name) { msg.innerHTML = `<div class="error-msg">Please enter a category name.</div>`; return; }
    const res = await apiCall('addCategory', { name });
    if (!res.ok) { msg.innerHTML = `<div class="error-msg">${escapeHtml(res.error)}</div>`; return; }
    await loadAll();
    render();
  };
}

/* ---------------- CRITERIA ---------------- */
function renderCriteria(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Judging Criteria</div>
      ${categorySelector('criteria')}
    </div>
    <div id="criteriaBody"></div>`;
  bindCategorySelector('criteria', () => render());
  renderCriteriaBody();
}
function renderCriteriaBody() {
  if (!categories.length) return;
  const catId = pickedCategory.criteria;
  const list = criteria.filter(c => c.categoryId === catId).sort((a, b) => a.sortOrder - b.sortOrder);
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="card">
      ${list.length ? `<table><thead><tr><th>Criteria</th><th>Max Score</th><th></th></tr></thead><tbody>
        ${list.map(c => `<tr>
          <td><input class="cri-name" data-id="${c.criteriaId}" value="${escapeHtml(c.name)}"></td>
          <td><input class="cri-max" type="number" min="1" data-id="${c.criteriaId}" value="${c.maxScore}" style="width:100px"></td>
          <td><button class="btn-outline btn-sm save-cri" data-id="${c.criteriaId}">Save</button></td>
        </tr>`).join('')}
      </tbody></table>` : `<div class="empty-state"><span class="big-emoji">📐</span><h3>No criteria yet</h3><p>Add the scoring criteria for this category below.</p></div>`}
    </div>
    <div class="card">
      <div class="ribbon-badge green">Add Criteria</div>
      <div class="grid-2">
        <div class="field"><label>Criteria Name</label><input id="newCriName" placeholder="e.g. Accuracy of Memory Verse"></div>
        <div class="field"><label>Max Score</label><input id="newCriMax" type="number" value="100" min="1"></div>
      </div>
      <button class="btn-primary" id="addCriBtn">＋ Add Criteria</button>
      <div id="criMsg"></div>
    </div>`;
  document.getElementById('criteriaBody').replaceWith(body);
  body.id = 'criteriaBody';

  body.querySelectorAll('.save-cri').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    const name = body.querySelector(`.cri-name[data-id="${id}"]`).value.trim();
    const max = body.querySelector(`.cri-max[data-id="${id}"]`).value;
    const res = await apiCall('editCriteria', { criteriaId: id, name, maxScore: max });
    if (!res.ok) return alert(res.error);
    await loadAll(); renderCriteriaBody();
  });

  document.getElementById('addCriBtn').onclick = async () => {
    const name = document.getElementById('newCriName').value.trim();
    const maxScore = document.getElementById('newCriMax').value;
    const msg = document.getElementById('criMsg');
    if (!name) { msg.innerHTML = `<div class="error-msg">Please enter a criteria name.</div>`; return; }
    const res = await apiCall('addCriteria', { categoryId: pickedCategory.criteria, name, maxScore });
    if (!res.ok) { msg.innerHTML = `<div class="error-msg">${escapeHtml(res.error)}</div>`; return; }
    await loadAll(); renderCriteriaBody();
  };
}

/* ---------------- PARTICIPANTS ---------------- */
function renderParticipants(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Participants</div>
      ${categorySelector('participants')}
    </div>
    <div id="participantsBody"></div>`;
  bindCategorySelector('participants', () => render());
  renderParticipantsBody();
}
function renderParticipantsBody() {
  if (!categories.length) return;
  const catId = pickedCategory.participants;
  const list = participants.filter(p => p.categoryId === catId).sort((a, b) => a.sortOrder - b.sortOrder);
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="card">
      ${list.length ? `<table><thead><tr><th>Contestant(s)</th><th>Church</th><th></th></tr></thead><tbody>
        ${list.map(p => `<tr>
          <td><input class="p-name" data-id="${p.participantId}" value="${escapeHtml(p.contestantNames)}"></td>
          <td><input class="p-church" data-id="${p.participantId}" value="${escapeHtml(p.church)}"></td>
          <td><button class="btn-outline btn-sm save-p" data-id="${p.participantId}">Save</button></td>
        </tr>`).join('')}
      </tbody></table>` : `<div class="empty-state"><span class="big-emoji">🧒</span><h3>No participants yet</h3><p>Add contestants for this category below.</p></div>`}
    </div>
    <div class="card">
      <div class="ribbon-badge green">Add Participant</div>
      <div class="grid-2">
        <div class="field"><label>Contestant Name(s)</label><input id="newPName" placeholder="e.g. Juan Dela Cruz (or a team name)"></div>
        <div class="field"><label>Church</label><input id="newPChurch" placeholder="e.g. KVCC Lipa"></div>
      </div>
      <button class="btn-primary" id="addPBtn">＋ Add Participant</button>
      <div id="pMsg"></div>
    </div>`;
  document.getElementById('participantsBody').replaceWith(body);
  body.id = 'participantsBody';

  body.querySelectorAll('.save-p').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    const name = body.querySelector(`.p-name[data-id="${id}"]`).value.trim();
    const church = body.querySelector(`.p-church[data-id="${id}"]`).value.trim();
    const res = await apiCall('editParticipant', { participantId: id, contestantNames: name, church });
    if (!res.ok) return alert(res.error);
    await loadAll(); renderParticipantsBody();
  });

  document.getElementById('addPBtn').onclick = async () => {
    const contestantNames = document.getElementById('newPName').value.trim();
    const church = document.getElementById('newPChurch').value.trim();
    const msg = document.getElementById('pMsg');
    if (!contestantNames) { msg.innerHTML = `<div class="error-msg">Please enter the contestant name(s).</div>`; return; }
    const res = await apiCall('addParticipant', { categoryId: pickedCategory.participants, contestantNames, church });
    if (!res.ok) { msg.innerHTML = `<div class="error-msg">${escapeHtml(res.error)}</div>`; return; }
    await loadAll(); renderParticipantsBody();
  };
}

/* ---------------- JUDGES ---------------- */
function renderJudges(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Judges</div>
      ${judges.length ? `<table><thead><tr><th>Username</th><th>Display Name</th><th>Judge ID</th><th>Assigned Categories</th></tr></thead><tbody>
        ${judges.map(j => `<tr>
          <td>${escapeHtml(j.username)}</td>
          <td>${escapeHtml(j.displayName)}</td>
          <td>${escapeHtml(j.judgeId)}</td>
          <td>${j.assignedCategories ? escapeHtml(catNames(j.assignedCategories)) : '<i>All categories</i>'}</td>
        </tr>`).join('')}
      </tbody></table>` : `<div class="empty-state"><span class="big-emoji">🧑‍⚖️</span><h3>No judges yet</h3><p>Create judge logins below.</p></div>`}
    </div>
    <div class="card">
      <div class="ribbon-badge green">Add Judge</div>
      <div class="grid-2">
        <div class="field"><label>Username</label><input id="newJUser" placeholder="e.g. judge1"></div>
        <div class="field"><label>Password</label><input id="newJPass" type="text" placeholder="Temporary password"></div>
        <div class="field"><label>Display Name</label><input id="newJName" placeholder="e.g. Pastor Ana"></div>
      </div>
      <div class="field">
        <label>Assigned Categories (leave all unchecked = can judge everything)</label>
        <div style="display:flex; gap:14px; flex-wrap:wrap;">
          ${categories.map(c => `<label style="font-weight:400; display:flex; align-items:center; gap:6px;"><input type="checkbox" class="jcat" value="${c.categoryId}"> ${escapeHtml(c.name)}</label>`).join('') || '<i>No categories yet</i>'}
        </div>
      </div>
      <button class="btn-primary" id="addJBtn">＋ Add Judge</button>
      <div id="jMsg"></div>
    </div>`;

  function catNames(csv) {
    return csv.split(',').map(id => (categories.find(c => c.categoryId === id.trim()) || {}).name || id).join(', ');
  }

  document.getElementById('addJBtn').onclick = async () => {
    const username = document.getElementById('newJUser').value.trim();
    const password = document.getElementById('newJPass').value.trim();
    const displayName = document.getElementById('newJName').value.trim();
    const assigned = Array.from(document.querySelectorAll('.jcat:checked')).map(c => c.value).join(',');
    const msg = document.getElementById('jMsg');
    if (!username || !password) { msg.innerHTML = `<div class="error-msg">Username and password are required.</div>`; return; }
    const res = await apiCall('addJudge', { username, password, displayName, assignedCategories: assigned });
    if (!res.ok) { msg.innerHTML = `<div class="error-msg">${escapeHtml(res.error)}</div>`; return; }
    msg.innerHTML = `<div class="success-msg">Judge created! Share the username and password with them.</div>`;
    await loadAll(); renderJudges(el);
  };
}

/* ---------------- LIVE SUMMARY ---------------- */
function renderSummary(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Live Scoring Summary</div>
      ${categorySelector('summary')}
    </div>
    <div id="summaryBody"></div>`;
  bindCategorySelector('summary', loadSummary);
  loadSummary();
}
async function loadSummary() {
  const body = document.getElementById('summaryBody');
  if (!categories.length) return;
  body.innerHTML = `<div class="card">Loading…</div>`;
  const data = await apiCall('adminScoreSummary', { categoryId: pickedCategory.summary });
  if (!data.ok) { body.innerHTML = `<div class="card error-msg">${escapeHtml(data.error)}</div>`; return; }

  if (!data.judgesInfo.length) {
    body.innerHTML = `<div class="card empty-state"><span class="big-emoji">📊</span><h3>No scores submitted yet</h3><p>This will fill in as judges start scoring.</p></div>`;
    return;
  }

  body.innerHTML = `
    <div class="card">
      <h3>Judges (anonymous IDs)</h3>
      <table><thead><tr><th>ID</th><th>Judge</th><th>Scores Given</th><th>Status</th></tr></thead><tbody>
        ${data.judgesInfo.map(j => `<tr>
          <td class="judge-anon-row">${j.anonLabel}</td>
          <td>${escapeHtml(j.displayName)}</td>
          <td>${j.scoresGiven}</td>
          <td>${j.locked ? '<span class="pill locked">Locked</span>' : '<span class="pill open">In progress</span>'}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card">
      <h3>Score Matrix</h3>
      <div class="table-wrap">
        <table><thead><tr>
          <th>Contestant / Church</th>
          ${data.judgesInfo.map(j => `<th>${j.anonLabel}</th>`).join('')}
          <th>Average</th>
        </tr></thead><tbody>
          ${data.table.map(row => `<tr>
            <td><div class="contestant-name">${escapeHtml(row.contestantNames)}</div><div class="church-name">${escapeHtml(row.church)}</div></td>
            ${row.perJudge.map(pj => `<td>${pj.total === null ? '<i>—</i>' : pj.total}</td>`).join('')}
            <td class="judge-summary-total">${row.average === null ? '–' : row.average.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

/* ---------------- RESULTS ---------------- */
function renderResultsTab(el) {
  el.innerHTML = `
    <div class="card">
      <div class="ribbon-badge blue">Compute &amp; Release Results</div>
      ${categorySelector('results')}
    </div>
    <div id="resultsBody"></div>`;
  bindCategorySelector('results', loadResultsTab);
  loadResultsTab();
}
async function loadResultsTab() {
  const body = document.getElementById('resultsBody');
  if (!categories.length) return;
  const catId = pickedCategory.results;
  const cat = categories.find(c => c.categoryId === catId);
  body.innerHTML = `<div class="card">Loading…</div>`;

  const res = await apiCall('getResults', { categoryId: catId });
  const computed = String(cat.computed) === 'true';
  const released = String(cat.released) === 'true';

  let rankingHtml = '';
  if (res.ok) {
    rankingHtml = `
      <div id="resultsCapture">
        <div class="result-header">
          <div class="ribbon-badge gold">KIDZ ASSEMBLY '26 RESULTS</div>
          <div class="cat-name display">${escapeHtml(res.categoryName)}</div>
        </div>
        ${res.ranking.map(r => `
          <div class="rank-row ${r.rank === 1 ? 'gold' : r.rank === 2 ? 'silver' : r.rank === 3 ? 'bronze' : ''}">
            <div class="rank-medal">${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '🎖️'}</div>
            <div class="rank-info">
              <div class="rank-title">${escapeHtml(r.title)}</div>
              <div class="rank-name">${escapeHtml(r.contestantNames)}</div>
              <div class="rank-church">${escapeHtml(r.church)}</div>
            </div>
            <div class="rank-score">${r.average.toFixed(2)}</div>
          </div>`).join('')}
        <div class="footer-note">"Go into all the world and preach the gospel to all creation." — Mark 16:15</div>
      </div>`;
  }

  body.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <div>Status: ${released ? '<span class="pill released">Released to judges</span>' : (computed ? '<span class="pill locked">Computed — not released</span>' : '<span class="pill open">Not computed yet</span>')}</div>
        <div style="display:flex; gap:8px;">
          ${!computed ? '<button class="btn-lock" id="computeBtn">🔒 Compute Results (locks all judge scores)</button>' : ''}
          ${computed && !released ? '<button class="btn-primary" id="releaseBtn">📣 Release to Judges</button>' : ''}
          ${computed ? '<button class="btn-secondary" id="downloadBtn">⬇️ Download as Image</button>' : ''}
        </div>
      </div>
      ${!computed ? `<p style="color:var(--ink-soft)">Computing will permanently lock every judge's scores for this category — make sure all judges are done first.</p>` : ''}
    </div>
    ${rankingHtml}`;

  const computeBtn = document.getElementById('computeBtn');
  if (computeBtn) computeBtn.onclick = async () => {
    if (!confirm('This locks ALL judges\' scores for this category and cannot be undone. Continue?')) return;
    const r = await apiCall('adminComputeResults', { categoryId: catId });
    if (!r.ok) return alert(r.error);
    await loadAll();
    loadResultsTab();
  };

  const releaseBtn = document.getElementById('releaseBtn');
  if (releaseBtn) releaseBtn.onclick = async () => {
    if (!confirm('Release final results to judges? This cannot be undone.')) return;
    const r = await apiCall('adminReleaseResults', { categoryId: catId });
    if (!r.ok) return alert(r.error);
    await loadAll();
    loadResultsTab();
  };

  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) downloadBtn.onclick = () => downloadResultsImage(res.categoryName);
}

function downloadResultsImage(categoryName) {
  const node = document.getElementById('resultsCapture');
  if (!node || typeof html2canvas === 'undefined') { alert('Image export library did not load — check your internet connection.'); return; }
  html2canvas(node, { backgroundColor: '#EAF6FF', scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `KidzAssembly26-Results-${categoryName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

(async function start() {
  await loadAll();
  render();
})();
