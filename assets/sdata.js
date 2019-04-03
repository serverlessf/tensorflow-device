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
const $state = document.querySelector('#state tbody');
const $policy = document.querySelector('#policy tbody');
const $mounts = document.querySelector('#mounts tbody');
const $env = document.querySelector('#env tbody');
const $cmd = document.querySelector('#cmd tbody');
var options = {};



function infoMount(str) {
  var out = {};
  for(var ln of str.split(',')) {
    var [k, v] = ln.split('=');
    out[k] = v||true;
  }
  return out;
}

function stateCount(name, ps) {
  var total = 0, created = 0, running = 0, exited = 0;
  for(var p of ps) {
    var pname = p.Names[0].substring(1), s = p.State;
    if(pname.replace(/\..*$/, '')!==name) continue;
    if(s==='created') created++;
    if(s==='running') running++;
    else if(s==='exited') exited++;
    total++;
  }
  return {total, created, running, exited};
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
  m.request({method: 'GET', url: '/service/'+o.service}).then((p) => {
    var q = `service=${o.service}&engine=${o.engine}&update=1`;
    $access.setAttribute('href', `/service/${o.service}/fs/`);
    $download.setAttribute('href', `/service/${o.service}/export`);
    $upload.setAttribute('href', `/upload.html?${q}`);
  });
  return o;
}

async function request(o) {
  console.log('request()', o);
  var name = o.service;
  var sp = m.request({method: 'GET', url: '/service/'+name});
  var psp = m.request({method: 'GET', url: '/process?all=1'});
  var [s, ps] = await Promise.all([sp, psp]);
  var {total, created, running, exited} = stateCount(name, ps);
  m.render($h2, [s.name, m('div', m('small', s.engine))]);
  m.render($state, m('tr', [
    m('td', moment(s.created).fromNow()), m('td', running),
    m('td', exited), m('td', created), m('td', total),
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

function onRun(o) {
  m.request({method: 'POST', url: `/service/${o.service}/run`}).then((data) => {
    iziToast.success({message: `Ran service ${o.service} as ${data.name}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}

function onButton(o, fn, pre) {
  m.request({method: 'POST', url: `/service/${o.service}/${fn}`}).then((data) => {
    iziToast.success({message: `${pre} service ${o.service}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options), 5000);
$run.onclick = () => onRun(options);
$stop.onclick = () => onButton(options, 'stop', 'Stopped');
$kill.onclick = () => onButton(options, 'kill', 'Killed');
$restart.onclick = () => onButton(options, 'restart', 'Restarted');
$pause.onclick = () => onButton(options, 'pause', 'Paused');
$unpause.onclick = () => onButton(options, 'unpause', 'Unpaused');
$remove.onclick = () => onButton(options, 'remove', 'Removed');
