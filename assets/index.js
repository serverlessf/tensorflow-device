var service = '', process = '';
var hash = location.hash.substring(1)||'os', hashid = '';
var top = false;
document.body.className = hash;



const processTop = () => document.body.classList.toggle('process_top');

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



function onHashChange() {
  hash = location.hash.substring(1)||'os';
  hashid = hash.replace(/.*?_/, '');
  service = '/service/'+hashid; process = '/process/'+hashid;
  document.body.className = hash.replace(/(.).*?_.*/, '$1data');
}



async function serviceList() {
  if(hash!=='slist') return;
  var tbody = document.querySelector('#slist tbody');
  var ssp = m.request({method: 'GET', url: '/service'});
  var csp = m.request({method: 'GET', url: '/process'});
  var [ss, cs] = await Promise.all([ssp, csp]);
  for(var k in ss) ss[k].processes = 0;
  cs.forEach(c => ss[c.Names[0].substring(1).replace(/\..*$/, '')].processes++);
  m.render(tbody, Object.values(ss).map(s => m('tr', [
    m('td', m('a', {href: '#service_'+s.name}, s.name)),
    m('td', s.version), m('td', s.engine), m('td', s.processes),
    m('td', s.ports.map(p => m('tag', p)))])));
}

function servicePost() {
  var form = document.querySelector('#spost form');
  var data = new FormData(form);
  m.request({method: 'POST', url: '/service', data}).then((data) => {
    iziToast.success({message: 'Created '+form.name.value});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}

async function serviceData() {
  if(!hash.startsWith('service_')) return;
  var id = hash.substring(8);
  var h2 = document.querySelector('#sdata h2');
  var status = document.querySelector('#service_status tbody');
  var policy = document.querySelector('#service_policy tbody');
  var mounts = document.querySelector('#service_mounts tbody');
  var env = document.querySelector('#service_env tbody');
  var cmd = document.querySelector('#service_cmd tbody');
  var s = await m.request({method: 'GET', url: '/service/'+id});
  m.render(h2, [s.name, m('div', m('small', s.engine))]);
  m.render(status, m('tr', [
    m('td', moment(s.created).fromNow()),
  ]));
  m.render(policy, m('tr', [
    m('td', s.workdir),
    m('td', s.ports.map(v => m('tag', v))),
    m('td', `${s.copyfs}`),
  ]));
  m.render(mounts, s.mounts.map(infoMount).map(v => m('tr', [
    m('td', v.type), m('td', v.source), m('td', v.target),
  ])));
  m.render(env, Object.keys(s.env).map(k => m('tr', [
    m('td', k), m('td', s.env[k]),
  ])));
  m.render(cmd, s.cmd.map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}



async function processList() {
  if(hash!=='plist') return;
  var tbody = document.querySelector('#plist tbody');
  var cs = await m.request({method: 'GET', url: '/process?all=1'});
  m.render(tbody, cs.map(c => m('tr', [
    m('td', m('a', {href: '#process_'+c.Names[0].substr(1)}, c.Names[0].substr(1))),
    m('td', c.Image), m('td', c.Status), m('td', c.Ports.map(p => (
    m('tag', `${p.PublicPort}->${p.PrivatePort}/${p.Type}`)
  )))])));
}

async function processData() {
  if(!hash.startsWith('process_')) return;
  var id = hash.substring(8);
  var h2 = document.querySelector('#pdata h2');
  var status = document.querySelector('#process_status tbody');
  var policy = document.querySelector('#process_policy tbody');
  var mounts = document.querySelector('#process_mounts tbody');
  var env = document.querySelector('#process_env tbody');
  var cmd = document.querySelector('#process_cmd tbody');
  var p = await m.request({method: 'GET', url: '/process/'+id});
  var s = p.State, hc = p.HostConfig, c = p.Config;
  var rp = hc.RestartPolicy, pb = hc.PortBindings;
  m.render(h2, [p.Name.substring(1), m('div', m('small', c.Image))]);
  m.render(status, m('tr', [
    m('td', `${s.Status} (${s.ExitCode}) ${s.Error}`),
    m('td', moment(p.Created).fromNow()),
    m('td', moment(s.StartedAt).fromNow()),
    m('td', moment(s.FinishedAt).fromNow()),
    m('td', p.RestartCount),
  ]));
  m.render(policy, m('tr', [
    m('td', c.WorkingDir),
    m('td', Object.keys(pb).map(k => m('tag', infoPortBinding(pb, k)))),
    m('td', `${rp.Name} (max: ${rp.MaximumRetryCount})`),
  ]));
  m.render(mounts, p.Mounts.map(v => m('tr', [
    m('td', v.Type), m('td', v.Source), m('td', v.Destination),
  ])));
  m.render(env, c.Env.map(v => m('tr', [
    m('td', v.split('=')[0]), m('td', v.split('=')[1]),
  ])));
  m.render(cmd, c.Cmd.map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}




async function exec() {
  var cmd = document.querySelector('#exec input').value;
  console.log(`exec(${cmd})`);
  var o = await m.request({method: 'POST', url: '/exec', data: {cmd}});
  var stdout = document.querySelector('#exec_stdout');
  var stderr = document.querySelector('#exec_stderr');
  m.render(stdout, o.stdout);
  m.render(stderr, o.stderr);
}



function osDevice(o) {
  var tbody = document.querySelector('#os_device tbody');
  var ks = ['arch', 'endianness', 'hostname', 'platform', 'release', 'type', 'uptime', 'tmpdir'];
  m.render(tbody, m('tr', ks.map(k => m('td', o[k]))));
}

function osStatus(o) {
  var tbody = document.querySelector('#os_status tbody');
  var tags = o.loadavg.map(load => m('tag', load));
  m.render(tbody, m('tr', [m('td', tags), m('td', o.totalmem), m('td', o.freemem)]));
}

function osUserInfo(o) {
  var tbody = document.querySelector('#os_userInfo tbody'), ui = o.userInfo;
  m.render(tbody, m('tr', Object.keys(ui).map(k => m('td', ui[k]))));
}

function osCpus(o) {
  var tbody = document.querySelector('#os_cpus tbody');
  m.render(tbody, o.cpus.map(cpu => {
    var tags = Object.keys(cpu.times).map(k => m('tag', k+': '+cpu.times[k]));
    return m('tr', [m('td', cpu.model), m('td', cpu.speed), m('td', tags)]);
  }));
}

function osNetworkInterfaces(o) {
  var tbody = document.querySelector('#os_networkInterfaces tbody'), trs = [];
  for(var k in o.networkInterfaces) {
    var nets = o.networkInterfaces[k];
    for(var n of nets)
      trs.push(m('tr', Object.keys(n).map((l, i) => m('td', i? n[l]:`${k}: ${n[l]}`))));
  }
  m.render(tbody, trs);
}

async function osRefresh() {
  if(hash!=='os') return;
  console.log('osRefresh()');
  var o = await m.request({method: 'GET', url: '/os'});
  osDevice(o);
  osStatus(o);
  osUserInfo(o);
  osCpus(o);
  osNetworkInterfaces(o);
}



onHashChange();
serviceList();
setInterval(serviceList, 1000);
processList();
setInterval(processList, 1000);
osRefresh();
setInterval(osRefresh, 1000);
serviceData();
setInterval(serviceData, 1000);
processData();
setInterval(processData, 1000);
window.onhashchange = onHashChange;
document.querySelector('#spost form').onsubmit = servicePost;
document.querySelector('#exec form').onsubmit = () => exec() && false;
