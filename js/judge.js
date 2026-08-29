requireLogin(['judge']);

const bunting = document.getElementById('bunting');
for (let i = 0; i < 40; i++) bunting.appendChild(document.createElement('span'));
document.getElementById('whoami').textContent = Session.displayName + ' (Judge)';
document.getElementById('logoutBtn').onclick = async () => {
  await apiCall('logout', {});
  Session.clear();
  window.location.href = 'index.html';
};

let categories = [];
let activeCategoryId = null;

async function init() {
  const data = await apiCall('bootstrap', {});
  if (!data.ok) return alert(data.error);
  categories = data.categories;
  renderCatTabs();
  if (categories.length) selectCategory(categories[0].categoryId);
  else document.getElementById('content').innerHTML = emptyState('🗓️', 'No categories yet', 'Ask the admin to add a judging category.');
}

function renderCatTabs() {
  const wrap = document.getElementById('catTabs');
  wrap.innerHTML = categories.map(c => `
    <button data-id="${c.categoryId}" class="${c.categoryId === activeCategoryId ? 'active' : ''}">
      ${escapeHtml(c.name)}
    </button>`).join('');
  wrap.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => selectCategory(btn.dataset.id);
  });
}

function emptyState(emoji, title, sub) {
  return `<div class="card empty-state"><span class="big-emoji">${emoji}</span><h3>${title}</h3><p>${sub}</p></div>`;
}

async function selectCategory(categoryId) {
  activeCategoryId = categoryId;
  renderCatTabs();
  const content = document.getElementById('content');
  content.innerHTML = `<div class="card">Loading scoring sheet…</div>`;

  const data = await apiCall('getJudgeCategoryData', { categoryId });
  if (!data.ok) { content.innerHTML = `<div class="card error-msg">${escapeHtml(data.error)}</div>`; return; }

  if (!data.criteria.length || !data.participants.length) {
    content.innerHTML = emptyState('🧩', 'Not ready yet', 'This category needs criteria and participants added by the admin before you can score it.');
    return;
  }

  const scoreMap = {};
  data.scores.forEach(s => { scoreMap[s.participantId + '|' + s.criteriaId] = s.score; });

  const category = data.category;
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <div>
          <div class="ribbon-badge green">${escapeHtml(category.name)}</div>
          <div>${data.locked ? '<span class="pill locked">🔒 Locked — final</span>' : '<span class="pill open">Open for scoring</span>'}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-secondary btn-sm" id="viewResultsBtn">View Results</button>
          ${data.locked ? '' : '<button class="btn-primary btn-sm" id="saveAllBtn">💾 Save Scores</button>'}
          ${data.locked ? '' : '<button class="btn-lock btn-sm" id="lockBtn">🔒 Lock &amp; Finalize</button>'}
        </div>
      </div>
      <div class="table-wrap">
        <table id="scoreTable">
          <thead><tr>
            <th>Contestant / Church</th>
            ${data.criteria.map(c => `<th>${escapeHtml(c.name)}<br><span style="font-weight:400;text-transform:none;">max ${c.maxScore}</span></th>`).join('')}
            <th>Total</th>
          </tr></thead>
          <tbody>
            ${data.participants.map(p => `
              <tr data-pid="${p.participantId}">
                <td>
                  <div class="contestant-name">${escapeHtml(p.contestantNames)}</div>
                  <div class="church-name">${escapeHtml(p.church)}</div>
                </td>
                ${data.criteria.map(c => `
                  <td>
                    <input type="number" class="score-input" min="0" max="${c.maxScore}" step="0.5"
                      data-pid="${p.participantId}" data-cid="${c.criteriaId}"
                      value="${scoreMap[p.participantId + '|' + c.criteriaId] ?? ''}"
                      ${data.locked ? 'disabled' : ''}>
                  </td>`).join('')}
                <td class="row-total">–</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  recomputeRowTotals();
  content.querySelectorAll('.score-input').forEach(inp => inp.addEventListener('input', recomputeRowTotals));

  document.getElementById('viewResultsBtn').onclick = () => {
    window.location.href = `results.html?categoryId=${encodeURIComponent(categoryId)}`;
  };

  const saveBtn = document.getElementById('saveAllBtn');
  if (saveBtn) saveBtn.onclick = () => saveAll(categoryId, data.criteria);

  const lockBtn = document.getElementById('lockBtn');
  if (lockBtn) lockBtn.onclick = () => lockScores(categoryId);
}

function recomputeRowTotals() {
  document.querySelectorAll('#scoreTable tbody tr').forEach(row => {
    const inputs = row.querySelectorAll('.score-input');
    let total = 0, filled = 0;
    inputs.forEach(i => { if (i.value !== '') { total += Number(i.value); filled++; } });
    row.querySelector('.row-total').textContent = filled === inputs.length ? total : '–';
  });
}

async function saveAll(categoryId, criteria) {
  const btn = document.getElementById('saveAllBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';
  const inputs = document.querySelectorAll('#scoreTable .score-input');
  let errors = [];
  for (const inp of inputs) {
    if (inp.value === '') continue;
    const res = await apiCall('saveScore', {
      categoryId, participantId: inp.dataset.pid, criteriaId: inp.dataset.cid, score: inp.value
    });
    if (!res.ok) errors.push(res.error);
  }
  btn.disabled = false;
  btn.innerHTML = '💾 Save Scores';
  if (errors.length) alert('Some scores did not save:\n' + errors.join('\n'));
  else {
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = '💾 Save Scores'; }, 1500);
  }
}

async function lockScores(categoryId) {
  if (!confirm('Are you sure? Once locked, you cannot change your scores for this category anymore.')) return;
  const res = await apiCall('lockMyScores', { categoryId });
  if (!res.ok) return alert(res.error);
  selectCategory(categoryId);
}

init();
