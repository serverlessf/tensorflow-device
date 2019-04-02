var section = location.hash.substring(1)||'os';
document.body.className = section;



function infoPortBinding(o, k) {
  return `${o[k][0].HostPort}->${k}`;
};

function infoMount(o) {
  var out = `${o.Type},source=${o.Source},target=${o.Destination}`;
  return o.RW? out:out+',readonly';
};



function onHashChange() {
  section = location.hash.substring(1);
  document.body.className = section;
}



async function serviceRefresh() {
  if(section!=='service') return;
  var tbody = document.querySelector('#service tbody');
  var ssp = m.request({method: 'GET', url: '/service'});
  var csp = m.request({method: 'GET', url: '/process'});
  var [ss, cs] = await Promise.all([ssp, csp]);
  for(var k in ss) ss[k].processes = 0;
  cs.forEach(c => ss[c.Names[0].substring(1).replace(/\..*$/, '')].processes++);
  m.render(tbody, Object.values(ss).map(s => m('tr', [
    m('td', s.name), m('td', s.version), m('td', s.engine),
    m('td', s.processes), m('td', s.ports.map(p => m('tag', p)))])));
}



async function processRefresh() {
  if(section!=='process') return;
  var tbody = document.querySelector('#process tbody');
  var cs = await m.request({method: 'GET', url: '/process?all=1'});
  m.render(tbody, cs.map(c => m('tr', [
    m('td', c.Id.substring(0, 12)), m('td', c.Names[0].substring(1)),
    m('td', c.Status), m('td', c.Ports.map(p => (
    m('tag', `${p.PublicPort}->${p.PrivatePort}/${p.Type}`)
  )))])));
}

async function processDetails(id) {
  var tbody = document.querySelector('#process_details tbody');
  var p = await m.request({method: 'GET', url: '/process/'+id});
  var s = p.State, hc = p.HostConfig, c = p.Config;
  var rp = hc.RestartPolicy, pb = hc.PortBindings;
  m.render(tbody, [
    ['ID', p.Id], ['Name', p.Name], ['Engine', c.Image],
    ['Status', `${s.Status} (${s.ExitCode}) ${s.Error}`],
    ['Created', moment(p.Created).fromNow()],
    ['Started', moment(s.StartedAt).fromNow()],
    ['Finished', moment(p.FinishedAt).fromNow()],
    ['Restarts', p.RestartCount],
    ['Restart Policy', `${rp.Name} (max: ${rp.MaximumRetryCount})`],
    ['Priviledged', hc.Priviledged],
    ['Working Dir', c.WorkingDir],
    ['Port Bindings', Object.keys(pb).map(k => m('tag', infoPortBinding(pb, k)))],
    ['Mounts', p.Mounts.map(v => m('tag', infoMount(v)))],
    ['Cmd', c.Cmd.map(v => `"${v}"`).join(' ')],
    ['Env', c.Env.map(v => m('tag', v))]
  ].map(tr => m('tr', [m('td', tr[0]), m('td', tr[1])])));
}



async function shell() {
  var cmd = document.querySelector('#shell input').value;
  console.log(`shell(${cmd})`);
  var o = await m.request({method: 'POST', url: '/shell', data: {cmd}});
  var stdout = document.querySelector('#shell_stdout');
  var stderr = document.querySelector('#shell_stderr');
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
  if(section!=='os') return;
  console.log('osRefresh()');
  var o = await m.request({method: 'GET', url: '/os'});
  osDevice(o);
  osStatus(o);
  osUserInfo(o);
  osCpus(o);
  osNetworkInterfaces(o);
}



processDetails('carevaluation.admiring_brahmagupta');
serviceRefresh();
setInterval(serviceRefresh, 1000);
processRefresh();
setInterval(processRefresh, 1000);
osRefresh();
setInterval(osRefresh, 1000);
window.onhashchange = onHashChange;
document.querySelector('#shell form').onsubmit = () => shell() && false;
