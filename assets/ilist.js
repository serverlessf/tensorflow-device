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
  return o;
}

async function request(o) {
  console.log('request()', o);
  var _is = m.request({method: 'GET', url: '/image'});
  var _cs = m.request({method: 'GET', url: '/container?all=0'});
  var [is, cs] = await Promise.all([_is, _cs]), imap = new Map();
  for(var i of is) { imap.set(i.id, i); i.containers = 0; }
  cs.forEach(c => (imap.get(c.id.replace(/\..*$/, ''))||{}).containers++);
  m.render($table, Object.values(is).map(i => m('tr', [
    m('td', m('a', {href: `/idata.html?image=${i.id}&from=${i.from}`}, i.id)),
    m('td', i.version), m('td', i.from), m('td', i.containers),
    m('td', (i.expose||[]).map(p => m('tag', p)))
  ])));
}



options = onReady();
request(options);
setInterval(() => request(options), 1000);
