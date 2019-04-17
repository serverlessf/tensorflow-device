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
const DIRNAME = path.dirname(require.main.filename);
const ROOT = path.join(process.cwd(), '_data');
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

function copyConfig() {
  var file = path.join(ROOT, CONFIGFILE);
  if(fs.existsSync(file)) return;
  fs.copyFileSync(path.join(DIRNAME, CONFIGFILE), file);
}



function status(state) {
  var file = path.join(ROOT, CONFIGFILE);
  return Promise.all([config.read(file), state||osValues()]).then(
    vs => Object.assign.apply(null, vs)
  );
}

function setStatus(value) {
  var file = path.join(ROOT, CONFIGFILE);
  return config.write(file, value);
}
exports.IP = IP;
exports.PORT = PORT;
exports.ADDRESS = ADDRESS;
exports.QUERY = QUERY;
exports.DIRNAME = DIRNAME;
exports.status = status;
exports.setStatus = setStatus;
fs.mkdirpSync(ROOT);
copyConfig();
