const $h2 = document.querySelector('h2');
const $p = document.querySelector('p');
const $table = document.querySelector('tbody');
var options = {};



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  m.render($h2, [o.process, m('div', m('small', o.engine||''))]);
  return o;
}

function render(o) {
  m.request({method: 'GET', url: `/process/${o.process}/top`}).then((t) => {
    m.render($table, t.Processes.map(p => m('tr', p.map(v => m('td', v)))));
    m.render($p, null);
  }, (err) => m.render($p, err.message));
}



options = onReady();
render(options);
setInterval(() => render(options), 1000);