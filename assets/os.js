const DEVICE = [
  'arch', 'endianness', 'hostname', 'platform',
  'release', 'type', 'uptime', 'tmpdir'
];
const $device = document.querySelector('#device tbody');
const $status = document.querySelector('#status tbody');
const $userInfo = document.querySelector('#userInfo tbody');
const $cpus = document.querySelector('#cpus tbody');
const $networkInterfaces = document.querySelector('#networkInterfaces tbody');



async function render() {
  console.log('render()');
  var o = await m.request({method: 'GET', url: '/os'});
  var ui = o.userInfo, ni = o.networkInterfaces;
  m.render($device, m('tr', DEVICE.map(k => m('td', o[k]))));
  m.render($status, m('tr', [
    m('td', o.loadavg.map(v => m('tag', v))),
    m('td', o.totalmem), m('td', o.freemem)
  ]));
  m.render($userInfo, m('tr', Object.keys(ui).map(k => m('td', ui[k]))));
  m.render($cpus, o.cpus.map(c => m('tr', [
    m('td', c.model), m('td', c.speed),
    Object.keys(c.times).map(k => m('tag', `${k}: ${c.times[k]}`))
  ])));
  m.render($networkInterfaces, Object.keys(ni).reduce((trs, k) => {
    for(var n of ni[k]) {
      var tds = Object.keys(n).map((l, i) => m('td', i? n[l]:`${k}: ${n[l]}`));
      trs.push(m('tr', tds));
    }
    return trs;
  }, []));
}



render();
setInterval(render, 1000);
