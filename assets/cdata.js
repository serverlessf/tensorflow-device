const $h2 = document.querySelector('h2');
const $p = document.querySelector('p');
const $start = document.querySelector('#start');
const $stop = document.querySelector('#stop');
const $kill = document.querySelector('#kill');
const $restart = document.querySelector('#restart');
const $pause = document.querySelector('#pause');
const $unpause = document.querySelector('#unpause');
const $remove = document.querySelector('#remove');
const $top = document.querySelector('#top');
const $logs = document.querySelector('#logs');
const $access = document.querySelector('#access');
const $download = document.querySelector('#download');
const $upload = document.querySelector('#upload');
const $state = document.querySelector('#state tbody');
const $policy = document.querySelector('#policy tbody');
const $mounts = document.querySelector('#mounts tbody');
const $env = document.querySelector('#env tbody');
const $cmd = document.querySelector('#cmd tbody');
var options = {};



function infoPortBinding(o, k) {
  return `${o[k][0].HostPort}->${k}`;
}

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
  m.request({method: 'GET', url: `/container/${o.container}/config`}).then((p) => {
    var q = `container=${o.container}&from=${p.image}&update=1`;
    $top.setAttribute('href', `/ctop.html?${q}`);
    $logs.setAttribute('href', `/clogs.html?${q}`);
    $upload.setAttribute('href', `/upload.html?${q}`);
    $access.setAttribute('href', `/container/${o.container}/fs/`);
    $download.setAttribute('href', `/container/${o.container}/export`);
  });
  return o;
}

async function request(o) {
  console.log('request()', o);
  var id = o.container;
  var p = await m.request({method: 'GET', url: `/container/${id}/config`});
  console.log(p);
  var s = p.State, hc = p.HostConfig, c = p.Config;
  // var rp = hc.RestartPolicy, pb = hc.PortBindings;
  m.render($h2, [p.id, m('div', m('small', p.image))]);
  m.render($state, m('tr', [
    m('td', `${p.status} (${p.exitcode}) ${p.error}`),
    m('td', moment(p.ctime).fromNow()),
    m('td', moment(p.stime).fromNow()),
    m('td', moment(p.ftime).fromNow()),
    m('td', p.restarts),
  ]));
  m.render($policy, m('tr', [
    m('td', p.workdir),
    m('td', Object.keys(p.publish||{}).map(k => m('tag', `${k}->${p.publish[k]}`))),
    m('td', `${p.restart} (max: ${p.maxrestart||'?'})`),
  ]));
  m.render($mounts, (p.mounts||[]).map(v => m('tr', [
    m('td', v.type), m('td', v.source), m('td', v.destination),
  ])));
  m.render($env, (p.env||[]).map(v => m('tr', [
    m('td', v.split('=')[0]), m('td', v.split('=')[1]),
  ])));
  m.render($cmd, (p.cmd||[]).map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}

function onButton(fn, pre, o) {
  m.request({method: 'POST', url: `/container/${o.container}/${fn}`}).then((data) => {
    iziToast.success({message: `${pre} container ${o.container}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options), 1000);
$start.onclick = () => onButton('start', 'Started', options);
$stop.onclick = () => onButton('stop', 'Stopped', options);
$kill.onclick = () => onButton('kill', 'Killed', options);
$restart.onclick = () => onButton('restart', 'Restarted', options);
$pause.onclick = () => onButton('pause', 'Paused', options);
$unpause.onclick = () => onButton('unpause', 'Unpaused', options);
$remove.onclick = () => onButton('remove', 'Removed', options);
