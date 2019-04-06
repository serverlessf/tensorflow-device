const dockerNames = require('docker-names');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const archiver = require('archiver');
const Docker = require('dockerode');
const express = require('express');
const needle = require('needle');
const net = require('extra-net');
const cp = require('extra-cp');
const fs = require('fs-extra');
const config = require('./config');
const fetch = require('./fetch');
const path = require('path');



const REFS = /\/.*?\/fs/;
const ROOT = config.SROOT;
const PROOT = config.PROOT;

const app = express();
const docker = new Docker();
const services = {};

const errNoService = (res, name) => res.status(404).json({message: 'Cant find service '+name});
const errServiceExists = (res, name) => res.status(405).json({message: 'Service '+name+' already exists'});
const wrap = (fn) => ((req, res, next) => fn(req, res, next).then(null, next));



async function processes(name) {
  var ps = await docker.listContainers({all: true});
  return ps.filter(p => p.Names[0].substring(1).replace(/\.[^\.]*/, '')===name);
}

app.get('/', (req, res) => res.json(services));
app.post('/', wrap(async (req, res) => {
  var {name, git, url, update} = req.body;
  var {file} = req.files||{}, s = services[name];
  name = name||path.parse(git||url||file.name).name;
  if(s && !update) return errServiceExists(res, name);
  var dir = path.join(ROOT, name);
  await fetch(dir, {git, url, file});
  var snew = await config.read(dir, Object.assign(req.body, {name}));
  snew.version = Math.max(snew.version, s? s.version+1:0);
  console.log({snew, dir});
  services[name] = s = await config.prepare(dir, snew);
  var {stdout} = await cp.exec(`docker build --tag=${name} .`, {cwd: dir});
  console.log(stdout);
  console.log(services);
  res.json(s);
}));
app.delete('/:name', wrap(async (req, res) => {
  var {name} = req.params;
  var dir = path.join(ROOT, name);
  if(!services[name]) return errNoService(res, name);
  var _del = [fs.remove(dir), docker.getImage(name).remove(req.body)];
  var cons = await processes(name);
  for(var c of cons.filter(c => c.Names[0].includes(name)))
    _del.push(docker.getContainer(c.Id).stop(req.body));
  await Promise.all(_del);
  delete services[name];
  res.json(null);
}));
app.get('/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  res.json(services[name]);
});
app.post('/:name', (req, res) => {
  var {name} = req.params;
  var dir = path.join(ROOT, name);
  if(!services[name]) return errNoService(res, name);
  config.write(dir, Object.assign(services[name], req.body, {name}));
  res.json(services[name]);
});
app.get('/:name/processes', wrap(async (req, res) => {
  var {name} = req.params;
  res.json(await processes(name));
}));
app.get('/:name/fs*', (req, res) => {
  console.log(req.ip, req.method, req.url, req.body);
  var {name} = req.params;
  req.url = req.url.replace(REFS, '')||'/';
  var dir = path.join(ROOT, name);
  var done = finalhandler(req, res);
  var index = serveIndex(dir, {icons: true});
  var static = serveStatic(dir);
  static(req, res, (err) => err? done(err):index(req, res, done));
});
app.post('/:name/fs*', wrap(async (req, res) => {
  var {name} = req.params, {file} = req.files;
  var rel = req.url.replace(REFS, '')||'/';
  var abs = path.join(ROOT, name, rel);
  await file.mv(abs);
  res.json(file.size);
}));
app.post('/:name/run', wrap(async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var pname = name+'.'+dockerNames.getRandomName();
  var o = Object.assign(req.body, services[name]);
  var cmd = await config.run(o, pname);
  var {stdout, stderr} = await cp.exec(cmd);
  var id = (stdout||stderr).trim();
  if(QUERY) await needle('post', `http://${QUERY}/${pname}`, o, {json: true});
  res.json({id, name: pname});
}));
app.get('/:name/export', (req, res) => {
  var {name} = req.params;
  var dir = path.join(ROOT, name);
  res.writeHead(200, {'content-type': 'application/zip'});
  var archive = archiver('zip', {zlib: {level: 9}});
  archive.pipe(res);
  archive.directory(dir+'/', false);
  archive.finalize();
});
app.post('/:name/:fn', wrap(async (req, res) => {
  var {name, fn} = req.params;
  var procs = await processes(name);
  var _outs = procs.map(p => docker.getContainer(p.Id)[fn](req.body));
  res.json(await Promise.all(_outs));
}));
fs.mkdirSync(ROOT, {recursive: true});
for(var name of fs.readdirSync(ROOT))
  config.read(path.join(ROOT, name)).then(o => services[name] = o);
module.exports = app;
