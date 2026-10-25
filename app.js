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


