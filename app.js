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
