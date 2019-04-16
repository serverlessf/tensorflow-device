const DEVICE = ['arch', 'endianness', 'hostname', 'platform', 'release', 'type', 'tmpdir'];
const $h2 = document.querySelector('h2');
const $deviceInfo = document.querySelector('#deviceInfo tbody');
const $userInfo = document.querySelector('#userInfo tbody');
const $usage = document.querySelector('#usage tbody');
const $cpus = document.querySelector('#cpus tbody');
const $networkInterfaces = document.querySelector('#networkInterfaces tbody');



async function request() {
  console.log('request()');
  var o = await m.request({method: 'GET', url: '/status'});
  var ui = o.userInfo, ni = o.networkInterfaces;
  m.render($h2, [o.id, m('div', m('small', o.owner))]);
  m.render($deviceInfo, m('tr', DEVICE.map(k => m('td', o[k]))));
  m.render($userInfo, m('tr', Object.keys(ui).map(k => m('td', `${ui[k]}`))));
  m.render($usage, m('tr', [
    m('td', o.uptime), m('td', o.totalmem), m('td', o.freemem),
    m('td', o.loadavg.map(v => m('tag', v))),
  ]));
  m.render($cpus, o.cpus.map(c => m('tr', [
    m('td', c.model), m('td', c.speed),
    m('td', Object.keys(c.times).map(k => m('tag', `${k}: ${c.times[k]}`)))
  ])));
  m.render($networkInterfaces, Object.keys(ni).reduce((trs, k) => {
    for(var n of ni[k]) {
      var tds = Object.keys(n).map((l, i) => m('td', i? n[l]:`${k}: ${n[l]}`));
      trs.push(m('tr', tds));
    }
    return trs;
  }, []));
}

request();
setInterval(request, 1000);
