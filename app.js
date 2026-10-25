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

function showCompare(params) {
  const startA = params.get('a') || 'o1';
  const startB = params.get('b') || 'o2';

  function options(selectedId) {
    return data.observations.map(o => {
      const s = getSource(o.sourceId);
      return `<option value="${o.id}" ${o.id === selectedId ? 'selected' : ''}>${esc(subjectName(o.projectId))} (${esc(s.title.replace('Sugar Land - Missouri City Edition, ', 'CI '))})</option>`;
    }).join('');
  }

  const pairs = findPairs();

  app.innerHTML = `
    <h1>Compare</h1>
    <p class="intro">Pick two records. The app only works out a difference when both figures measure the same thing.</p>
    <div class="filters">
      <label class="field">Record A<select id="a">${options(startA)}</select></label>
      <label class="field">Record B<select id="b">${options(startB)}</select></label>
    </div>
    <p class="small muted">To see a refusal, try <a href="#/compare?a=o2&b=o11">a proposition total against one project</a>.</p>
    <div id="result"></div>
    <h2>Pairs I can compare</h2>
    <div class="scroll"><table>
      <thead><tr><th>Subject</th><th class="right">Change</th><th></th></tr></thead>
      <tbody>${pairs.map(([x, y]) => {
        const r = compareRecords(x, y);
        return `<tr><td>${esc(subjectName(x.projectId))}</td>
          <td class="right">${signedMoney(r.change)}</td>
          <td><a href="#/compare?a=${x.id}&b=${y.id}">Open</a></td></tr>`;
      }).join('')}</tbody>
    </table></div>`;

  function drawResult() {
    const x = getRecord(document.getElementById('a').value);
    const y = getRecord(document.getElementById('b').value);
    // keeps the address bar in sync so a comparison can be shared
    history.replaceState(null, '', '#/compare?a=' + x.id + '&b=' + y.id);
    const r = compareRecords(x, y);
    const out = document.getElementById('result');

    if (!r.ok) {
      out.innerHTML = `<div class="note"><b>These can't be compared directly.</b>
        <ul>${r.reasons.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
      return;
    }

    // if both numbers are from the same edition there is no real earlier/later
    const names = r.sameDate ? ['Record A', 'Record B'] : ['Earlier record', 'Later record'];
    const column = (rec, label) => `
      <div>
        <div class="small muted">${label}</div>
        <div class="big">${money(rec.value)}</div>
        <dl>
          <dt>Measures</dt><dd>${esc(data.metrics[rec.metricType].label)}</dd>
          <dt>Published</dt><dd>${niceDate(rec.publicationDate)}</dd>
          <dt>Source</dt><dd>${esc(getSource(rec.sourceId).title)}</dd>
          <dt>Location</dt><dd>${esc(rec.sourceLocator)}</dd>
        </dl>
        ${link(getSource(rec.sourceId).url, 'View original source')}
      </div>`;

    let percentText = '';
    if (r.percent !== null && r.change !== 0) percentText = ' (' + (r.percent > 0 ? '+' : '−') + Math.abs(r.percent).toFixed(2) + '%)';

    out.innerHTML = `
      <div class="compare-cols">${column(r.earlier, names[0])}${column(r.later, names[1])}</div>
      <h2>Result</h2>
      <div class="big">${r.change === 0 ? 'No change' : signedMoney(r.change)}<span class="small muted">${percentText}</span></div>
      <p>${r.change === 0 ? 'Both records print the same figure.' : 'The two records print different figures.'} A difference does not say whether something is good or bad.</p>
      ${r.sameDate ? '<div class="note warn"><b>Same edition.</b> Both figures are in the same publication, so this is not a change over time. One page prints a rounded number, but I can\'t confirm that explains the whole gap.</div>' : ''}
      <p class="small muted">Change = ${r.sameDate ? 'B − A' : 'later − earlier'}. Percent = change ÷ ${r.sameDate ? 'A' : 'earlier'}.</p>`;
  }

  document.getElementById('a').addEventListener('change', drawResult);
  document.getElementById('b').addEventListener('change', drawResult);
  drawResult();
}

//Methodology
function showMethodology() {
  // do the project figures add up to each proposition total?
  const checks = data.propositions.filter(p => !p.program).map(prop => {
    const totals = data.observations.filter(o => o.projectId === prop.id).sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));
    const authorized = totals[totals.length - 1].value;
    const projects = data.projects.filter(p => p.subject === prop.id);
    let sum = 0;
    projects.forEach(p => {
      const recs = recordsFor(p.id);
      if (recs.length) sum += recs[0].value; // first figure listed (page 9 before page 16)
    });
    return { name: prop.name, authorized, sum, gap: authorized - sum };
  });

  app.innerHTML = `
    <h1>Methodology</h1>

    <h2>Money terms</h2>
    <div class="scroll"><table>
      <thead><tr><th>Term</th><th>Meaning</th><th>In the app?</th></tr></thead>
      <tbody>
        <tr><td>Voter authorization</td><td>${esc(data.metrics.voter_authorization.def)}</td><td>Yes</td></tr>
        <tr><td>Published project allocation</td><td>${esc(data.metrics.published_project_allocation.def)}</td><td>Yes</td></tr>
        <tr><td>Adopted budget</td><td>Money the city formally funds for one fiscal year.</td><td>Not yet</td></tr>
        <tr><td>Planning estimate</td><td>A later-year plan in a capital improvement program, which can change.</td><td>Not yet</td></tr>
        <tr><td>Expenditure</td><td>Money actually spent.</td><td>Not yet</td></tr>
      </tbody>
    </table></div>

    <h2>Rules</h2>
    <ul>
      <li>Two records are compared only if they measure the same thing for the same project and period.</li>
      <li>Change is the later figure minus the earlier one, and percent is the change divided by the earlier figure.</li>
      <li>A missing figure stays missing; it is never treated as $0.</li>
      <li>Three dates are different things: when a document was published, when I retrieved it (${niceDate(data.meta.retrievedAt)}), and when the city last updated the information.</li>
      <li>"Source linked" only means a record has a URL and a location. It does not mean the source is correct.</li>
    </ul>

    <h2>Do the project figures add up?</h2>
    <p class="small muted">Adds up the project figures I have entered and compares them to each proposition total. A gap usually means projects I haven't entered yet.</p>
    <div class="scroll"><table>
      <thead><tr><th>Proposition</th><th class="right">Authorized</th><th class="right">Entered</th><th class="right">Gap</th><th>Result</th></tr></thead>
      <tbody>${checks.map(c => `<tr>
        <td>${esc(c.name)}</td><td class="right">${money(c.authorized)}</td><td class="right">${money(c.sum)}</td><td class="right">${money(c.gap)}</td>
        <td>${c.gap === 0 ? '<span class="tag green">Adds up exactly</span>' : '<span class="tag yellow">Not all projects entered</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>

    <h2>Known gaps</h2>
    ${data.dataQuality.map(t => `<div class="note warn">${esc(t)}</div>`).join('')}

    <h2>What this can't tell you:</h2>
    <ul>
      <li>Whether a project is on time, late or over budget</li>
      <li>How much has been spent</li>
      <li>Whether a change in a published figure is good or bad</li>
    </ul>`;
}


function route() {
  if (!data) return;
  const [path, query] = location.hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  const page = parts[0] || 'projects';

  // highlight the current link in the sidebar
  document.querySelectorAll('nav a').forEach(a => {
    const current = page === 'project' ? 'projects' : page;
    a.classList.toggle('active', a.dataset.page === current);
  });

  if (page === 'projects') showProjects();
  else if (page === 'project') showProject(parts[1]);
  else if (page === 'compare') showCompare(new URLSearchParams(query || ''));
  else if (page === 'evidence') showEvidence();
  else if (page === 'methodology') showMethodology();
  else app.innerHTML = '<h1>Page not found</h1><p><a href="#/projects">Back to projects</a></p>';

  window.scrollTo(0, 0);
}

fetch('data/data.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    prepareData();
    route();
  })
  .catch(() => {
    app.innerHTML = '<div class="note warn"><b>Could not load data/data.json.</b> Browsers block this when the page is opened as a file. Run <code>python3 -m http.server</code> in this folder and open <code>http://localhost:8000</code>.</div>';
  });

window.addEventListener('hashchange', route);

