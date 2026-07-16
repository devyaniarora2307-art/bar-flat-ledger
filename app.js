const raw = JSON.parse(document.getElementById('post-data').textContent);

// scrape date from most recent postedAt-independent: use max time in data as proxy, or fixed
const scrapeDate = "__SCRAPE_DATE__";
document.getElementById('scrapeDate').textContent = scrapeDate;
document.getElementById('totalCount').textContent = raw.length;
document.getElementById('allCount').textContent = raw.length;

// Populate area multi-select
const areaCounts = {};
raw.forEach(r => (r.areas || []).forEach(a => { areaCounts[a] = (areaCounts[a] || 0) + 1; }));
const allAreas = Object.keys(areaCounts).sort((a,b) => areaCounts[b] - areaCounts[a] || a.localeCompare(b));
let selectedAreas = new Set();

const areaDropdown = document.getElementById('area-dropdown');
const areaSearch = document.getElementById('f-area-search');
const areaChips = document.getElementById('area-chips');

function renderAreaDropdown(){
  const q = areaSearch.value.trim().toLowerCase();
  const list = allAreas.filter(a => a.toLowerCase().includes(q));
  areaDropdown.innerHTML = list.map(a => `
    <label>
      <input type="checkbox" data-area="${a}" ${selectedAreas.has(a) ? 'checked' : ''}>
      ${a}
      <span class="count">${areaCounts[a]}</span>
    </label>
  `).join('') || '<div style="padding:10px; font-size:12px; color:var(--ink-soft);">No matching areas</div>';

  areaDropdown.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const a = cb.getAttribute('data-area');
      if (cb.checked) selectedAreas.add(a); else selectedAreas.delete(a);
      renderAreaChips();
      render();
    });
  });
}

function renderAreaChips(){
  areaChips.innerHTML = [...selectedAreas].map(a => `
    <span class="area-chip">${a}<button data-area="${a}" title="Remove">×</button></span>
  `).join('');
  areaChips.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAreas.delete(btn.getAttribute('data-area'));
      renderAreaChips();
      renderAreaDropdown();
      render();
    });
  });
}

areaSearch.addEventListener('focus', () => { areaDropdown.classList.add('open'); renderAreaDropdown(); });
areaSearch.addEventListener('input', renderAreaDropdown);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.area-dropdown') && e.target !== areaSearch){
    areaDropdown.classList.remove('open');
  }
});
renderAreaDropdown();

// Populate BHK filter
const bhkOrder = ['1RK','2RK','1BHK','2BHK','3BHK','4BHK','5BHK'];
const bhks = [...new Set(raw.map(r => r.bhk).filter(Boolean))]
  .sort((a,b) => {
    const ia = bhkOrder.indexOf(a), ib = bhkOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
const bhkSel = document.getElementById('f-bhk');
bhks.forEach(b => {
  const o = document.createElement('option');
  o.value = b; o.textContent = b;
  bhkSel.appendChild(o);
});

const budgetInput = document.getElementById('f-budget');
const budgetVal = document.getElementById('f-budget-val');
budgetInput.addEventListener('input', () => {
  budgetVal.textContent = (+budgetInput.value >= 100000) ? 'Any' : '₹' + (+budgetInput.value).toLocaleString('en-IN');
  render();
});

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
  const bhk = document.getElementById('f-bhk').value;
  const gender = document.getElementById('f-gender').value;
  const maxBudget = +budgetInput.value;
  const moveinQ = document.getElementById('f-movein').value.trim().toLowerCase();
  const showListing = document.getElementById('f-listing').checked;
  const showSeeking = document.getElementById('f-seeking').checked;
  const showUnclear = document.getElementById('f-unclear').checked;

  return raw.filter(r => {
    if (selectedAreas.size > 0){
      const rAreas = r.areas || [];
      const hasMatch = rAreas.some(a => selectedAreas.has(a));
      if (!hasMatch) return false;
    }
    if (bhk && r.bhk !== bhk) return false;
    if (gender){
      if (gender === '__none' && r.gender) return false;
      if (gender !== '__none' && r.gender !== gender) return false;
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
        sortDir = key === 'rent' ? 'desc' : 'desc';
      }
      render();
    });
  });
}

['f-area','f-bhk','f-gender','f-listing','f-seeking','f-unclear'].forEach(id => {
  document.getElementById(id).addEventListener('change', render);
});
document.getElementById('f-movein').addEventListener('input', render);
document.getElementById('reset-btn').addEventListener('click', () => {
  selectedAreas.clear();
  areaSearch.value = '';
  renderAreaChips();
  renderAreaDropdown();
  document.getElementById('f-bhk').value = '';
  document.getElementById('f-gender').value = '';
  budgetInput.value = 100000;
  budgetVal.textContent = 'Any';
  document.getElementById('f-movein').value = '';
  document.getElementById('f-listing').checked = true;
  document.getElementById('f-seeking').checked = true;
  document.getElementById('f-unclear').checked = false;
  render();
});

render();
