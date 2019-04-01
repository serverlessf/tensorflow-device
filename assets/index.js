var section = location.hash.substring(1)||'os';
document.body.className = section;


function onHashChange() {
  section = location.hash.substring(1);
  document.body.className = section;
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

osRefresh();
setInterval(osRefresh, 1000);
window.onhashchange = onHashChange;
