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
  var ssp = m.request({method: 'GET', url: '/image'});
  var csp = m.request({method: 'GET', url: '/container'});
  var [ss, cs] = await Promise.all([ssp, csp]);
  for(var k in ss) ss[k].containers = 0;
  cs.forEach(c => ss[c.Names[0].substring(1).replace(/\..*$/, '')].containers++);
  m.render($table, Object.values(ss).map(s => m('tr', [
    m('td', m('a', {href: `/idata.html?image=${s.name}&from=${s.from}`}, s.name)),
    m('td', s.version), m('td', s.from), m('td', s.containers),
    m('td', s.ports.map(p => m('tag', p)))
  ])));
}



options = onReady();
request(options);
setInterval(() => request(options), 1000);
