const $h2 = document.querySelector('h2');
const $form = document.querySelector('form');
const $cmd = document.querySelector('#cmd');
const $interval = document.querySelector('#interval');
const $stdout = document.querySelector('#stdout');
const $stderr = document.querySelector('#stderr');
var options = {};



function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  if(o.cmd) $cmd.value = o.cmd;
  if(o.interval) $interval.value = o.interval;
  m.render($h2, o.container? m([o.container, m('div', m('small', o.from||''))]):null);
  document.body.className = o.container? 'container':'os';
  return o;
}

function request(cmd, o) {
  console.log('request()', cmd, o);
  var url = o.container? `/container/${o.container}/exec`:'/exec';
  m.request({method: 'POST', url, data: {cmd}}).then((data) => {
    m.render($stdout, data.stdout);
    m.render($stderr, data.stderr);
  }, (err) => {
    m.render($stderr, err.stderr);
  });
}



options = onReady();
if($cmd.value) request($cmd.value, options);
$cmd.onchange = () => request($cmd.value, options) && false;
setInterval(() => {
  if(parseInt($interval.value)) request($cmd.value, options);
}, 1000);
