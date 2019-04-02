const path = require('path');
const fs = require('fs');



const ROOT = path.dirname(require.main.filename);
const CONFIGFILE = 'config.json';
const ARRAYKEYS = ['ports', 'mounts', 'env', 'cmd'];
const DEFAULTPATH = path.join(ROOT, 'config');
const DEFAULTENGINE = 'python:3';
const DEFAULTS = new Map();
const NOP = () => 0;



function defaults(o) {
  ARRAYKEYS.forEach(k => { if(typeof o[k]==='string') o[k] = o[k].split(';'); });
  o = Object.assign(DEFAULTS.get((o.engine||DEFAULTENGINE).replace(/\W/g, '_')), o);
  o = Object.assign(DEFAULTS.get('index'), o);
  for(var k in o.env) o.env[k] = o.env[k].replace(/\$\{port\}/g, o.ports[0]);
  o.created = o.created||new Date();
  return o;
}

function write(dir, value) {
  var file = path.join(dir, CONFIGFILE);
  fs.writeFile(file, JSON.stringify(value, null, 2), NOP);
}

function read(dir) {
  var file = path.join(dir, CONFIGFILE);
  var o = fs.existsSync(file)? JSON.parse(fs.readFileSync(file, 'utf8')):{};
  return defaults(Object.assign(o, {path: dir}));
}

function readAll(dir, configs={}) {
  for(var name of fs.readdirSync(dir))
    configs[name] = Object.assign(read(path.join(dir, name)), {name});
  return configs;
}
exports.defaults = defaults;
exports.write = write;
exports.read = read;
exports.readAll = readAll;



for(var file of fs.readdirSync(DEFAULTPATH)) {
  var fname = file.substring(0, file.length-path.extname(file).length);
  var config = JSON.parse(fs.readFileSync(path.join(DEFAULTPATH, file), 'utf8'));
  DEFAULTS.set(fname, config);
}
