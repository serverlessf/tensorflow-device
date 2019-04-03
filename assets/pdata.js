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
  m.request({method: 'GET', url: '/process/'+o.process}).then((p) => {
    var q = `process=${o.process}&engine=${p.Config.Image}&update=1`;
    $top.setAttribute('href', `/ptop.html?${q}`);
    $logs.setAttribute('href', `/plogs.html?${q}`);
    $upload.setAttribute('href', `/upload.html?${q}`);
    $access.setAttribute('href', `/process/${o.process}/fs/`);
    $download.setAttribute('href', `/process/${o.process}/export`);
  });
  return o;
}

async function request(o) {
  console.log('request()', o);
  var id = o.process;
  var p = await m.request({method: 'GET', url: '/process/'+id});
  var s = p.State, hc = p.HostConfig, c = p.Config;
  var rp = hc.RestartPolicy, pb = hc.PortBindings;
  m.render($h2, [p.Name.substring(1), m('div', m('small', c.Image))]);
  m.render($state, m('tr', [
    m('td', `${s.Status} (${s.ExitCode}) ${s.Error}`),
    m('td', moment(p.Created).fromNow()),
    m('td', moment(s.StartedAt).fromNow()),
    m('td', moment(s.FinishedAt).fromNow()),
    m('td', p.RestartCount),
  ]));
  m.render($policy, m('tr', [
    m('td', c.WorkingDir),
    m('td', Object.keys(pb).map(k => m('tag', infoPortBinding(pb, k)))),
    m('td', `${rp.Name} (max: ${rp.MaximumRetryCount})`),
  ]));
  m.render($mounts, p.Mounts.map(v => m('tr', [
    m('td', v.Type), m('td', v.Source), m('td', v.Destination),
  ])));
  m.render($env, c.Env.map(v => m('tr', [
    m('td', v.split('=')[0]), m('td', v.split('=')[1]),
  ])));
  m.render($cmd, c.Cmd.map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}

function onButton(fn, pre, o) {
  m.request({method: 'POST', url: `/process/${o.process}/${fn}`}).then((data) => {
    iziToast.success({message: `${pre} process ${o.process}`});
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
