const fs = require('extra-fs');
const net = require('extra-net');
const os = require('os');
const path = require('path');
const config = require('./config');



const E = process.env;
const IP = net.address().address;
const PORT = parseInt(E['PORT']||'8000', 10);
const ADDRESS = IP+':'+PORT;
const QUERY = E['QUERY']||'';
const QUERYADDR = E['QUERYADDR']||'';
const ROOT = path.join(process.cwd(), '_data');
const DIRNAME = path.dirname(require.main.filename);
const RANDOMID = Math.random().toString(36).substr(-8);
const CONFIGFILE = 'config.json';
const OSFUNCTIONS = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];



function getState(fns=OSFUNCTIONS) {
  var out = {};
  for(var f of fns)
    if(OSFUNCTIONS.includes(f)) out[f] = os[f]();
  return out;
}

function getStatus(state) {
  var file = path.join(ROOT, CONFIGFILE);
  var vstate = {address: ADDRESS, query: QUERY, queryaddr: QUERYADDR};
  return Promise.all([config.read(file), state||getState(), vstate]).then(
    vs => Object.assign.apply(null, vs)
  );
}

function setStatus(value) {
  var file = path.join(ROOT, CONFIGFILE);
  return config.write(file, value);
}

async function setupConfig() {
  var data = path.join(ROOT, CONFIGFILE);
  var orig = path.join(DIRNAME, CONFIGFILE);
  if(fs.existsSync(data)) return;
  var value = Object.assign({id: RANDOMID}, await config.read(orig));
  await config.write(data, value);
}
exports.IP = IP;
exports.PORT = PORT;
exports.ADDRESS = ADDRESS;
exports.QUERY = QUERY;
exports.QUERYADDR = QUERYADDR;
exports.DIRNAME = DIRNAME;
exports.state = getState;
exports.status = getStatus;
exports.setStatus = setStatus;
fs.mkdirpSync(ROOT);
setupConfig();
