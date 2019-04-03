const $h2 = document.querySelector('h2');
const $run = document.querySelector('#run');
const $start = document.querySelector('#start');
const $stop = document.querySelector('#stop');
const $kill = document.querySelector('#kill');
const $restart = document.querySelector('#restart');
const $pause = document.querySelector('#pause');
const $unpause = document.querySelector('#unpause');
const $remove = document.querySelector('#remove');
const $access = document.querySelector('#access');
const $download = document.querySelector('#download');
const $upload = document.querySelector('#upload');
const $state = document.querySelector('#state');
const $policy = document.querySelector('#policy');
const $mounts = document.querySelector('#mounts');
const $env = document.querySelector('#env');
const $cmd = document.querySelector('#cmd');
var options = {};



function infoMount(str) {
  var out = {};
  for(var ln of str.split(',')) {
    var [k, v] = ln.split('=');
    out[k] = v||true;
  }
  return out;
}

function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  $access.setAttribute('href', `/service/${o.service}/fs/`);
  m.request({method: 'GET', url: '/process/'+o.process}).then((p) => {
    var q = `process=${o.process}&engine=${p.Config.Image}&update=1`;
    $upload.setAttribute('href', `/upload.html?${q}`);
    $access.setAttribute('href', `/process/${o.process}/fs/`);
    $download.setAttribute('href', `/process/${o.process}/export`);
  });
  return o;
}

async function request(o) {
  console.log('request()', o);
  var id = o.service;
  var s = await m.request({method: 'GET', url: '/service/'+id});
  m.render($h2, [s.name, m('div', m('small', s.engine))]);
  m.render($status, m('tr', [
    m('td', moment(s.created).fromNow()),
  ]));
  m.render($policy, m('tr', [
    m('td', s.workdir),
    m('td', s.ports.map(v => m('tag', v))),
    m('td', `${s.copyfs}`),
  ]));
  m.render($mounts, s.mounts.map(infoMount).map(v => m('tr', [
    m('td', v.type), m('td', v.source), m('td', v.target),
  ])));
  m.render($env, Object.keys(s.env).map(k => m('tr', [
    m('td', k), m('td', s.env[k]),
  ])));
  m.render($cmd, s.cmd.map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}

function onButton(fn, pre, o) {
  m.request({method: 'POST', url: `/service/${o.service}/${fn}`}).then((data) => {
    iziToast.success({message: `${pre} service ${o.service}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options), 5000);
$run.onclick = () => onButton('run', 'Ran', options);
$stop.onclick = () => onButton('stop', 'Stopped', options);
$kill.onclick = () => onButton('kill', 'Killed', options);
$restart.onclick = () => onButton('restart', 'Restarted', options);
$pause.onclick = () => onButton('pause', 'Paused', options);
$unpause.onclick = () => onButton('unpause', 'Unpaused', options);
$remove.onclick = () => onButton('remove', 'Removed', options);
