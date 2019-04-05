const net = require('extra-net');
const path = require('path');
const fs = require('fs');



const E = process.env;
const ROOT = path.dirname(require.main.filename);
const PORT = E['PORT']||'8000';
const IP = net.address().address;
const ADDRESS = IP+':'+PORT;
const QUERY = E['QUERY']||'';

const CONFIGFILE = 'config.json';
const ARRAYKEYS = ['ports', 'mounts', 'env', 'cmd'];
const DEFAULTPATH = path.join(ROOT, 'config');
const DEFAULTENGINE = 'python:3';
const DEFAULTS = new Map();



function defaults(o) {
  ARRAYKEYS.forEach(k => { if(typeof o[k]==='string') o[k] = o[k].split(';'); });
  o = Object.assign(DEFAULTS.get((o.engine||DEFAULTENGINE).replace(/\W/g, '_')), o);
  o = Object.assign(DEFAULTS.get('index'), o);
  o.created = o.created||new Date();
  return o;
}

async function write(dir, value) {
  var file = path.join(dir, CONFIGFILE);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

async function read(dir) {
  var file = path.join(dir, CONFIGFILE);
  var o = fs.existsSync(file)? JSON.parse(await fs.readFile(file, 'utf8')):{};
  return Object.assign(o, {path: dir});
}
exports.ROOT = ROOT;
exports.PORT = PORT;
exports.IP = IP;
exports.ADDRESS = ADDRESS;
exports.QUERY = QUERY;
exports.defaults = defaults;
exports.write = write;
exports.read = read;



for(var file of fs.readdirSync(DEFAULTPATH)) {
  var config = JSON.parse(fs.readFileSync(path.join(DEFAULTPATH, file), 'utf8'));
  DEFAULTS.set(path.parse(file).name, config);
}
