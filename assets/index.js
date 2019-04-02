var hash = location.hash.substring(1)||'os';
document.body.className = hash;



function infoPortBinding(o, k) {
  return `${o[k][0].HostPort}->${k}`;
};

function infoMount(o) {
  var out = `${o.Type},source=${o.Source},target=${o.Destination}`;
  return o.RW? out:out+',readonly';
};



function onHashChange() {
  hash = location.hash.substring(1);
  document.body.className = hash.replace(/_.*/, '_details');
  if(hash.startsWith('process_')) processDetails(hash.substring(8));
}



async function serviceRefresh() {
  if(hash!=='service') return;
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
  if(hash!=='process') return;
  var tbody = document.querySelector('#process tbody');
  var cs = await m.request({method: 'GET', url: '/process?all=1'});
  m.render(tbody, cs.map(c => m('tr', [
    m('td', m('a', {href: '#process_'+c.Names[0].substr(1)}, c.Names[0].substr(1))),
    m('td', c.Image), m('td', c.Status), m('td', c.Ports.map(p => (
    m('tag', `${p.PublicPort}->${p.PrivatePort}/${p.Type}`)
  )))])));
}

async function processDetails(id) {
  var h2 = document.querySelector('#process_details h2');
  var pstatus = document.querySelector('#process_status tbody');
  var ppolicy = document.querySelector('#process_policy tbody');
  var pmounts = document.querySelector('#process_mounts tbody');
  var penv = document.querySelector('#process_env tbody');
  var pcmd = document.querySelector('#process_cmd tbody');
  var p = await m.request({method: 'GET', url: '/process/'+id});
  var s = p.State, hc = p.HostConfig, c = p.Config;
  var rp = hc.RestartPolicy, pb = hc.PortBindings;
  m.render(h2, [p.Name.substring(1), m('div', m('small', c.Image))]);
  m.render(pstatus, m('tr', [
    m('td', `${s.Status} (${s.ExitCode}) ${s.Error}`),
    m('td', moment(p.Created).fromNow()),
    m('td', moment(s.StartedAt).fromNow()),
    m('td', p.RestartCount),
  ]));
  m.render(ppolicy, m('tr', [
    m('td', c.WorkingDir),
    m('td', Object.keys(pb).map(k => m('tag', infoPortBinding(pb, k)))),
    m('td', `${rp.Name} (max: ${rp.MaximumRetryCount})`),
  ]));
  m.render(pmounts, p.Mounts.map(v => m('tr', [
    m('td', v.Type), m('td', v.Source), m('td', v.Destination),
  ])));
  m.render(penv, c.Env.map(v => m('tr', [
    m('td', v.split('=')[0]), m('td', v.split('=')[1]),
  ])));
  m.render(pcmd, c.Cmd.map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
  // [
  //   ['Cmd', c.Cmd.map(v => `"${v}"`).join(' ')],
  //   ['Env', c.Env.map(v => m('tag', v))]
  // ].map(tr => m('tr', [m('td', tr[0]), m('td', tr[1])])));
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
serviceRefresh();
setInterval(serviceRefresh, 1000);
processRefresh();
setInterval(processRefresh, 1000);
osRefresh();
setInterval(osRefresh, 1000);
window.onhashchange = onHashChange;
document.querySelector('#shell form').onsubmit = () => shell() && false;
