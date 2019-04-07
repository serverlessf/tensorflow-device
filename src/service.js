const dockerNames = require('docker-names');
const archiver = require('archiver');
const Docker = require('dockerode');
const decompress = require('extra-decompress');
const needle = require('needle');
const cp = require('extra-cp');
const fs = require('extra-fs');
const config = require('./config');
const path = require('path');



const REFS = /\/.*?\/fs/;
const ROOT = config.SROOT;

const docker = new Docker();
const configs = new Map();





function get(name) {
  return configs.get(name);
}

function dir(name) {
  return path.join(ROOT, name);
}

function version(name) {
  return configs.has(name)? configs.get(name).version : -1;
}

async function processes(name) {
  var ps = await docker.listContainers({all: true});
  return ps.filter(p => p.Names[0].substring(1).replace(/\.[^\.]*/, '')===name);
}

async function set(name, input, options) {
  var o = Object.assign({}, options);
  if(configs.has(name) && !o.update) return false;
  var dir = path.join(ROOT, name);
  await decompress(input, dir);
  var cfg = await config.read(dir, o);
  cfg.name = name;
  cfg.version = Math.max(cfg.version, version(name)+1);
  cfg = await config.prepare(dir, cfg);
  configs.set(name, cfg);
  await cp.exec(`docker build --tag=${name} .`, {cwd: dir});
  return true;
}

async function _delete(name, options) {
  var o = Object.assign({}, options);
  if(!configs.has(name)) return false;
  var dir = path.join(ROOT, name);
  var _del = [fs.remove(dir), docker.getImage(name).remove(o)];
  for(var p of (await processes(name)))
    _del.push(docker.getContainer(p.Id).stop(o));
  await Promise.all(_del);
  configs.delete(name);
  return true;
}



function perform(name, action, options) {
  var ps = await processes(name);
  return Promise.all(ps.map(p => docker.getContainer(p.Id)[action](options)));
}


exports.get = get;
exports.dir = dir;
exports.set = set;
exports.delete = _delete;
exports.processes = processes;

fs.mkdirSync(ROOT, {recursive: true});
for(var name of fs.readdirSync(ROOT))
  config.read(path.join(ROOT, name)).then(o => configs.set(name, o));
