const $prune = document.querySelector('#prune');
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
  var cs = await m.request({method: 'GET', url: '/process?all=1'});
  m.render($table, cs.map(c => m('tr', [
    m('td', m('a', {href: `/pdata.html?process=${c.Names[0].substr(1)}&engine=${c.Image}`}, c.Names[0].substr(1))),
    m('td', c.Image), m('td', c.Status), m('td', c.Ports.map(p => (
    m('tag', `${p.PublicPort}->${p.PrivatePort}/${p.Type}`)
  )))])));
}

function onPrune(o) {
  m.request({method: 'POST', url: '/process/prune'}).then((data) => {
    iziToast.success({message: `${(data.ContainersDeleted||[]).length} processes removed`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options), 1000);
$prune.onclick = () => onPrune(options);
