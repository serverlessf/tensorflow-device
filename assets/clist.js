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
  var cs = await m.request({method: 'GET', url: '/container'});
  m.render($table, cs.map(c => m('tr', [
    m('td', m('a', {href: `/cdata.html?container=${c.id}&from=${c.image}`}, c.id)),
    m('td', c.image), m('td', c.message), m('td', Object.keys(c.publish||{}).map(k => (
    m('tag', `${k}->${c.publish[k]}`)
  )))])));
}

function onPrune(o) {
  var cmd = 'docker container prune -f';
  m.request({method: 'POST', url: '/exec', data: {cmd}}).then((data) => {
    iziToast.success({message: `${data.stdout.split('\n').length} containers removed`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options), 1000);
$prune.onclick = () => onPrune(options);
