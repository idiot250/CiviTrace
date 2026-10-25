const app=document.getElementById('app');

//html escape function
function esc(text){
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


function money(n){
  if(n===null || n=== undefined){
    return 'Not reported'; 
    //handles cases where $0 (not equivalent to missing)
  }
  return '$' + n.toLocaleString('en-US');
}

//change in money inc/dec over time
function signedMoney(n){
  if(n === 0) return '$0';
	return (n>0 ? '+' : '-') + money(Math.abs(n));
}

//format dates
//the data uses 2 formats(yyyy-mm or yyyy-mm-dd)
//prettified date example: October 3, 2024
function niceDate(d){
  if(!d) return 'Date not found';//handle missing dates
  const months = ['Janurary', 'Feburary', 'March', 
	  'April', 'May', 'June', 'July', 'August', 
	  'September', 'October', 'November', 'December'];
  const [y,m,day] = d.split('-'); //split where hyphen and form into array
  return months[+m -1] + (day ? ' ' + +day+ ',' : '') +  ' ' +y;
  //+ in front of months converts to number
  //-1 for 0 based indexing
  //ternary checks if the date includes a day
}

//link to external sources
function link(url, text){
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}↗</a>`;
}

//looking things up from data
const getSource = id => data.sources.find(s => s.id === id);
const getProject = id => data.projects.find(p => p.id === id);
const getRecord = id => data.observations.find(o => o.id === id);

// a project id OR a proposition id
function subjectName(id) {
  const found = getProject(id) || data.propositions.find(p => p.id === id);
  return found ? found.name : id;
}

// all figures for one project with oldest first
function recordsFor(projectId) {
  return data.observations
    .filter(o => o.projectId === projectId)
    .sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));
}

// fills in fields i didn't want to type 27 times in the JSON
function prepareData() {
  data.observations.forEach(o => {
    o.publicationDate = getSource(o.sourceId).publicationDate;
    o.currency = 'USD';
    o.fiscalPeriod = '2024 bond program';
    o.retrievedAt = data.meta.retrievedAt;
    o.comparisonGroup = o.projectId + '|' + o.metricType;
  });
}

// every pair of records that share a comparison group
function findPairs() {
  const groups = {};
  data.observations.forEach(o => {
    if (!groups[o.comparisonGroup]) groups[o.comparisonGroup] = [];
    groups[o.comparisonGroup].push(o);
  });
  const pairs = [];
  Object.values(groups).forEach(list => {
    list.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) pairs.push([list[i], list[j]]);
    }
  });
  return pairs;
}

//COMPARISON RULES////////////////
// Returns { ok: false, reasons: [...] } or { ok: true, a, b, change, percent }
// Only compares when both numbers mean the same thing.
function compareRecords(x, y) {
  const reasons = [];
  if (x.id === y.id) reasons.push('You picked the same record twice.');
  if (x.metricType !== y.metricType) {
    reasons.push('They measure different things: "' + data.metrics[x.metricType].label + '" and "' + data.metrics[y.metricType].label + '".');
  }
  if (x.comparisonGroup !== y.comparisonGroup) reasons.push('They are about different projects or propositions.');
  if (x.fiscalPeriod !== y.fiscalPeriod) reasons.push('They cover different periods.');
  if (x.value === null || y.value === null) reasons.push('One of the values is missing.');
  if (reasons.length > 0) return { ok: false, reasons };

  const earlier = x.publicationDate <= y.publicationDate ? x : y;
  const later = earlier === x ? y : x;
  const change = later.value - earlier.value;
  return {
    ok: true,
    earlier,
    later,
    change,
    percent: earlier.value === 0 ? null : (change / earlier.value) * 100,
    sameDate: earlier.publicationDate === later.publicationDate
  };
}

///////
//Project listing and id
function showProjects() {
  app.innerHTML = `
    <h1>Projects</h1>
    <p class="intro">Projects from Sugar Land's 2024 bond program, with the published figures and documents behind them.</p>
    <div class="note warn"><b>Hand-entered data.</b> ${esc(data.meta.dataNote)}</div>
    <div class="filters">
      <input type="search" id="search" placeholder="Search projects" aria-label="Search projects">
      <select id="prop" aria-label="Filter by proposition">
        <option value="">All propositions</option>
        ${data.propositions.filter(p => !p.program).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <div id="list"></div>`;

  const search = document.getElementById('search');
  const prop = document.getElementById('prop');

  function drawList() {
    const text = search.value.trim().toLowerCase();
    const rows = data.projects.filter(p => {
      if (prop.value && p.subject !== prop.value) return false;
      return (p.name + ' ' + p.category).toLowerCase().includes(text);
    });

    if (rows.length === 0) {
      document.getElementById('list').innerHTML = '<p class="muted">No projects match. Try clearing the search.</p>';
      return;
    }

    document.getElementById('list').innerHTML = `
      <p class="small muted">${rows.length} of ${data.projects.length} projects</p>
      <div class="scroll"><table>
        <thead><tr><th>Project</th><th>Proposition</th><th class="right">Latest figure</th><th>Records</th></tr></thead>
        <tbody>${rows.map(p => {
          const recs = recordsFor(p.id);
          const first = recs[0];
          let status = '<span class="tag grey">No figure yet</span>';
          if (recs.length === 1) status = '<span class="tag yellow">One publication</span>';
          if (recs.length > 1) status = '<span class="tag green">Can compare</span>';
          return `<tr>
            <td><a href="#/project/${p.id}">${esc(p.name)}</a></td>
            <td>${esc(subjectName(p.subject).split(':')[0])}</td>
            <td class="right">${first ? money(first.value) : '—'}</td>
            <td>${status}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }

  search.addEventListener('input', drawList);
  prop.addEventListener('change', drawList);
  drawList();
}

function showProject(id) {
  const p = getProject(id);
  if (!p) {
    app.innerHTML = '<h1>Project not found</h1><p><a href="#/projects">Back to projects</a></p>';
    return;
  }
  const recs = recordsFor(id);
  const sourceIds = [...new Set(recs.map(r => r.sourceId))];
  const pair = findPairs().find(pr => pr[0].projectId === id);

  const recordsHtml = recs.length === 0
    ? '<div class="note warn"><b>No figure collected yet.</b> That does not mean $0 -- It means that the sources I used listed this project without a dollar amount.</div>'
    : recs.map(r => `
      <div class="record">
        <div class="big">${money(r.value)}</div>
        <dl>
          <dt>Measures</dt><dd>${esc(data.metrics[r.metricType].label)}</dd>
          <dt>Published</dt><dd>${niceDate(r.publicationDate)}</dd>
          <dt>Source</dt><dd>${link(getSource(r.sourceId).url, getSource(r.sourceId).title)}</dd>
          <dt>Location</dt><dd>${esc(r.sourceLocator)}</dd>
          ${r.note ? `<dt>Note</dt><dd>${esc(r.note)}</dd>` : ''}
        </dl>
      </div>`).join('');

  const metricTypes = [...new Set(recs.map(r => r.metricType))];

  app.innerHTML = `
    <a class="back" href="#/projects">← All projects</a>
    <h1>${esc(p.name)}</h1>
    <p class="intro">${esc(p.category)} · ${esc(subjectName(p.subject))}</p>
    <p>${link(data.meta.trackerUrl, "City's bond project tracker")}</p>
    <div class="two-col">
      <div>
        <h2>About</h2>
        <p>${esc(p.description)}</p>
        <p class="small muted">status and schedule are not checked by CiviTrace.</p>
        <h2>Published figures</h2>
        ${metricTypes.map(t => `<p class="small muted"><b>${esc(data.metrics[t].label)}:</b> ${esc(data.metrics[t].def)}</p>`).join('')}
        ${recordsHtml}
        ${pair
          ? `<p><a class="button" href="#/compare?a=${pair[0].id}&b=${pair[1].id}">Compare these two records</a></p>`
          : recs.length ? '<p class="small muted">Only one publication so far, so there is nothing to compare yet!</p>' : ''}
      </div>
      <div>
        <h2>Sources</h2>
        ${sourceIds.length ? sourceIds.map(sid => {
          const s = getSource(sid);
          return `<p><b>${esc(s.title)}</b><br><span class="small muted">${esc(s.org)}<br>${esc(s.type)}</span><br>${link(s.url, 'Open source :)')}</p>`;
        }).join('') : '<p class="muted">None yet.</p>'}
      </div>
    </div>`;
}

//Observation table/source docs/filtering
function showEvidence() {
  app.innerHTML = `
    <h1>Evidence ledger</h1>
    <p class="intro">Every figure in the app and where it came from: Retrieved is the day I looked at the document and published is when the document came out.</p>
    <div class="filters">
      <select id="src" aria-label="Filter by source">
        <option value="">All sources</option>
        ${data.sources.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}
      </select>
    </div>
    <div id="rows"></div>
    <h2>Sources</h2>
    <div class="scroll"><table>
      <thead><tr><th>Document</th><th>Type</th><th>Published</th></tr></thead>
      <tbody>${data.sources.map(s => `<tr>
        <td>${link(s.url, s.title)}<br><span class="small muted">${esc(s.org)}</span></td>
        <td>${esc(s.type)}</td><td>${niceDate(s.publicationDate)}</td></tr>`).join('')}</tbody>
    </table></div>`;

  const select = document.getElementById('src');
  function drawRows() {
    const list = data.observations.filter(o => !select.value || o.sourceId === select.value);
    document.getElementById('rows').innerHTML = `
      <p class="small muted">${list.length} records</p>
      <div class="scroll"><table>
        <thead><tr><th>Subject</th><th class="right">Value</th><th>Measure</th><th>Location in source</th><th>Published</th><th>Retrieved</th></tr></thead>
        <tbody>${list.map(o => `<tr>
          <td>${esc(subjectName(o.projectId))}</td>
          <td class="right">${money(o.value)}</td>
          <td>${esc(data.metrics[o.metricType].label)}</td>
          <td>${esc(o.sourceLocator)}<br>${link(getSource(o.sourceId).url, 'View original source')}</td>
          <td>${niceDate(o.publicationDate)}</td>
          <td>${niceDate(o.retrievedAt)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  }
  select.addEventListener('change', drawRows);
  drawRows();
}

