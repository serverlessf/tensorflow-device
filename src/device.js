const fs = require('extra-fs');
const os = require('os');
const path = require('path');
const config = require('./config');



const ROOT = path.join(process.cwd(), '_data');
const CONFIGFILE = 'config.json';
const OSFUNCTIONS = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];



function osValues(fns=OSFUNCTIONS) {
  var out = {};
  for(var f of fns)
    if(OSFUNCTIONS.includes(f)) out[f] = os[f]();
  return out;
}

function copyConfig() {
  var file = path.join(ROOT, CONFIGFILE);
  if(fs.existsSync(file)) return;
  fs.copyFileSync(path.join(__dirname, CONFIGFILE), file);
}



function status(state=osValues()) {
  var file = path.join(ROOT, CONFIGFILE);
  return Promise.all([config.read(file), state]).then(vs => Object.assign.apply(null, vs));
}

function setStatus(value) {
  var file = path.join(ROOT, CONFIGFILE);
  return config.write(file, value);
}
exports.status = status;
exports.setStatus = setStatus;
fs.mkdirpSync(ROOT);
copyConfig();
