const fs = require('extra-fs');
const net = require('extra-net');
const os = require('os');
const path = require('path');
const config = require('./config');



const E = process.env;
const IP = net.address().address;
const PORT = parseInt(E['PORT']||'8000', 10);
const ADDRESS = IP+':'+PORT;
const QUERY = E['QUERY']||ADDRESS;
const ROOT = path.join(process.cwd(), '_data');
const DIRNAME = path.dirname(require.main.filename);
const RANDOMID = Math.random().toString(36).substr(-8);
const CONFIGFILE = 'config.json';
const OSFUNCTIONS = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];



function osValues(fns=OSFUNCTIONS) {
  var out = {address: ADDRESS};
  for(var f of fns)
    if(OSFUNCTIONS.includes(f)) out[f] = os[f]();
  return out;
}

async function setupConfig() {
  if(config.exists(ROOT)) return;
  var value = Object.assign({id: RANDOMID}, await config.read(DIRNAME));
  await config.write(ROOT, value);
}



function status(state) {
  return Promise.all([config.read(ROOT), state||osValues()]).then(
    vs => Object.assign.apply(null, vs)
  );
}

function setStatus(value) {
  return config.write(ROOT, value);
}
exports.IP = IP;
exports.PORT = PORT;
exports.ADDRESS = ADDRESS;
exports.QUERY = QUERY;
exports.DIRNAME = DIRNAME;
exports.status = status;
exports.setStatus = setStatus;
fs.mkdirpSync(ROOT);
setupConfig();
