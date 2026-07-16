const raw = JSON.parse(document.getElementById('post-data').textContent);

const scrapeDate = "__SCRAPE_DATE__";
document.getElementById('scrapeDate').textContent = scrapeDate;
document.getElementById('totalCount').textContent = raw.length;
document.getElementById('allCount').textContent = raw.length;

const bhkOrder = ['1RK','2RK','1BHK','2BHK','3BHK','4BHK','5BHK'];

function bhkSortKey(a){
  const i = bhkOrder.indexOf(a);
  return i === -1 ? 999 : i;
}

/* ---------- Generic multi-select (used for Area, BHK, Gender) ---------- */
function makeMultiSelect({ inputId, dropdownId, chipsId, counts, sortFn, onChange }) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const chips = document.getElementById(chipsId);
  const selected = new Set();
  const allValues = Object.keys(counts).sort(sortFn);

  function renderDropdown(){
    const q = input.value.trim().toLowerCase();
    const list = allValues.filter(v => v.toLowerCase().includes(q));
    dropdown.innerHTML = list.map(v => `
      <label>
        <input type="checkbox" data-val="${v}" ${selected.has(v) ? 'checked' : ''}>
        ${v}
        <span class="count">${counts[v]}</span>
      </label>
    `).join('') || '<div style="padding:10px; font-size:12px; color:var(--ink-soft);">No matches</div>';

    dropdown.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        const v = cb.getAttribute('data-val');
        if (cb.checked) selected.add(v); else selected.delete(v);
        renderChips();
        onChange();
      });
    });
  }

  function renderChips(){
    chips.innerHTML = [...selected].map(v => `
      <span class="area-chip">${v}<button data-val="${v}" title="Remove">×</button></span>
    `).join('');
    chips.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        selected.delete(btn.getAttribute('data-val'));
        renderChips();
        renderDropdown();
        onChange();
      });
    });
  }

  input.addEventListener('focus', () => { dropdown.classList.add('open'); renderDropdown(); });
  input.addEventListener('input', renderDropdown);

  renderDropdown();

  return {
    selected,
    clear(){ selected.clear(); input.value = ''; renderChips(); renderDropdown(); },
  };
}

// Close any open dropdown when clicking elsewhere on the page
document.addEventListener('click', (e) => {
  document.querySelectorAll('.area-dropdown.open').forEach(dd => {
    const triggerInput = dd.previousElementSibling;
    if (!e.target.closest('.area-dropdown') && e.target !== triggerInput){
      dd.classList.remove('open');
    }
  });
});

// --- Area counts ---
const areaCounts = {};
raw.forEach(r => (r.areas || []).forEach(a => { areaCounts[a] = (areaCounts[a] || 0) + 1; }));

// --- BHK counts ---
const bhkCounts = {};
raw.forEach(r => { if (r.bhk) bhkCounts[r.bhk] = (bhkCounts[r.bhk] || 0) + 1; });

// --- Gender counts (include "Not mentioned" as an explicit option) ---
const genderCounts = {};
raw.forEach(r => {
  const g = r.gender || 'Not mentioned';
  genderCounts[g] = (genderCounts[g] || 0) + 1;
});

const areaMS = makeMultiSelect({
  inputId: 'f-area-search', dropdownId: 'area-dropdown', chipsId: 'area-chips',
  counts: areaCounts,
  sortFn: (a,b) => areaCounts[b] - areaCounts[a] || a.localeCompare(b),
  onChange: render,
});

const bhkMS = makeMultiSelect({
  inputId: 'f-bhk-search', dropdownId: 'bhk-dropdown', chipsId: 'bhk-chips',
  counts: bhkCounts,
  sortFn: (a,b) => bhkSortKey(a) - bhkSortKey(b),
  onChange: render,
});

const genderMS = makeMultiSelect({
  inputId: 'f-gender-search', dropdownId: 'gender-dropdown', chipsId: 'gender-chips',
  counts: genderCounts,
  sortFn: (a,b) => genderCounts[b] - genderCounts[a],
  onChange: render,
});

/* ---------- Budget slider ---------- */
const budgetInput = document.getElementById('f-budget');
const budgetVal = document.getElementById('f-budget-val');
budgetInput.addEventListener('input', () => {
  budgetVal.textContent = (+budgetInput.value >= 100000) ? 'Any' : '₹' + (+budgetInput.value).toLocaleString('en-IN');
  render();
});

/* ---------- Table rendering ---------- */
let sortKey = 'postedAt';
let sortDir = 'desc';

function fmtRent(r){
  if (!r.rent) return '<span class="rent na">not listed</span>';
  return '<span class="rent">₹' + r.rent.toLocaleString('en-IN') + '</span>';
}

function tagClass(t){
  if (t === 'Listing') return 'listing';
  if (t === 'Seeking') return 'seeking';
  return 'unclear';
}

function timeAgo(iso){
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
}

function applyFilters(){
  const maxBudget = +budgetInput.value;
  const moveinQ = document.getElementById('f-movein').value.trim().toLowerCase();
  const showListing = document.getElementById('f-listing').checked;
  const showSeeking = document.getElementById('f-seeking').checked;
  const showUnclear = document.getElementById('f-unclear').checked;

  return raw.filter(r => {
    if (areaMS.selected.size > 0){
      const rAreas = r.areas || [];
      if (!rAreas.some(a => areaMS.selected.has(a))) return false;
    }
    if (bhkMS.selected.size > 0){
      if (!r.bhk || !bhkMS.selected.has(r.bhk)) return false;
    }
    if (genderMS.selected.size > 0){
      const g = r.gender || 'Not mentioned';
      if (!genderMS.selected.has(g)) return false;
    }
    if (maxBudget < 100000){
      if (r.rent && r.rent > maxBudget) return false;
    }
    if (moveinQ){
      if (!(r.moveIn && r.moveIn.toLowerCase().includes(moveinQ))) return false;
    }
    if (r.type === 'Listing' && !showListing) return false;
    if (r.type === 'Seeking' && !showSeeking) return false;
    if (r.type === 'Unclear' && !showUnclear) return false;
    return true;
  });
}

function sortRows(rows){
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a,b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'areas'){
      av = (av && av.length) ? av.join(', ') : '';
      bv = (bv && bv.length) ? bv.join(', ') : '';
    }
    if (sortKey === 'rent'){
      av = av || -1; bv = bv || -1;
    }
    if (sortKey === 'postedAt'){
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    }
    if (av == null) av = '';
    if (bv == null) bv = '';
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

const columns = [
  {key:'areas', label:'Area'},
  {key:'bhk', label:'BHK'},
  {key:'rent', label:'Rent'},
  {key:'gender', label:'Gender'},
  {key:'moveIn', label:'Move-in'},
  {key:'type', label:'Type'},
  {key:'groupName', label:'Group'},
  {key:'postedAt', label:'Posted'},
];

function render(){
  const filtered = sortRows(applyFilters());
  document.getElementById('shownCount').textContent = filtered.length;
  document.getElementById('sortLabel').textContent = 'sorted by ' + columns.find(c=>c.key===sortKey).label.toLowerCase() + ' (' + sortDir + ')';

  const holder = document.getElementById('tableHolder');

  if (filtered.length === 0){
    holder.innerHTML = '<div class="empty-state">No posts match these filters. Try widening the area, budget, or move-in search.</div>';
    return;
  }

  let html = '<table><thead><tr>';
  columns.forEach(c => {
    let arrow = '';
    if (c.key === sortKey) arrow = '<span class="arrow">' + (sortDir === 'asc' ? '▲' : '▼') + '</span>';
    html += `<th data-key="${c.key}">${c.label}${arrow}</th>`;
  });
  html += '<th>Snippet</th><th>Link</th></tr></thead><tbody>';

  filtered.forEach(r => {
    html += '<tr>';
    html += `<td data-label="Area" class="area-cell">${(r.areas && r.areas.length) ? r.areas.join(', ') : '—'}</td>`;
    html += `<td data-label="BHK">${r.bhk || '—'}</td>`;
    html += `<td data-label="Rent">${fmtRent(r)}</td>`;
    html += `<td data-label="Gender">${r.gender || '—'}</td>`;
    html += `<td data-label="Move-in">${r.moveIn || '—'}</td>`;
    html += `<td data-label="Type"><span class="tag ${tagClass(r.type)}">${r.type}</span></td>`;
    html += `<td data-label="Group" class="group-cell">${r.groupName || '—'}</td>`;
    html += `<td data-label="Posted" class="group-cell">${timeAgo(r.postedAt)}</td>`;
    html += `<td data-label="Snippet"><span class="snippet">${(r.snippet||'').replace(/</g,'&lt;')}</span></td>`;
    html += `<td data-label="Link"><a class="postlink" href="${r.postLink}" target="_blank" rel="noopener">View post →</a></td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  holder.innerHTML = html;

  holder.querySelectorAll('thead th[data-key]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (sortKey === key){
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'desc';
      }
      render();
    });
  });
}

['f-listing','f-seeking','f-unclear'].forEach(id => {
  document.getElementById(id).addEventListener('change', render);
});
document.getElementById('f-movein').addEventListener('input', render);

document.getElementById('reset-btn').addEventListener('click', () => {
  areaMS.clear();
  bhkMS.clear();
  genderMS.clear();
  budgetInput.value = 100000;
  budgetVal.textContent = 'Any';
  document.getElementById('f-movein').value = '';
  document.getElementById('f-listing').checked = true;
  document.getElementById('f-seeking').checked = true;
  document.getElementById('f-unclear').checked = false;
  render();
});

render();
