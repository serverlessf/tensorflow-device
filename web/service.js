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
const ROOT = process.cwd()+'/_data/service';
const PROOT = process.cwd()+'/_data/process';

const app = express();
const docker = new Docker();
const services = {};

const errNoService = (res, name) => res.status(404).json({message: 'Cant find service '+name});
const errServiceExists = (res, name) => res.status(405).json({message: 'Service '+name+' already exists'});
const wrap = (fn) => ((req, res, next) => (
  fn(req, res, next).then(null, next)
));



async function commandRun(o, pname) {
  var ppath = o.copyfs? path.join(PROOT, pname):o.path;
  if(o.copyfs) await fs.copy(o.path, ppath);
  var freePorts = await Promise.all(o.ports.map(p => net.freePort()));
  o.env['DEVICE'] = global.ADDRESS;
  o.env['PORT'] = o.ports.join();
  o.env['ADDRESS'] = freePorts.map(p => global.IP+':'+p).join();
  var workdir = `-w ${o.workdir}`, name = `--name ${pname}`;
  var ports = o.ports.reduce((str, port, i) => str+` -p ${freePorts[i]}:${port}`, '');
  var mounts = o.mounts.reduce((str, mount) => str+` --mount ${mount}`, '');
  var env = Object.keys(o.env).reduce((str, k) => str+` -e ${k}=${o.env[k]}`, '');
  var image = o.engine, cmd = o.cmd.join(' ');
  mounts = mounts.replace(/\$path/g, ppath);
  return `docker run -d ${workdir} ${name} ${ports} ${mounts} ${env} -it ${image} ${cmd}`;
};

async function processes(name) {
  var ps = await docker.listContainers({all: true});
  return ps.filter(p => p.Names[0].substring(1).replace(/\.[^\.]*/, '')===name);
}

app.get('/', (req, res) => res.json(services));
app.post('/', wrap(async (req, res) => {
  var {name, git, url, update} = req.body;
  var {file} = (req.files||{}), s = services[name];
  name = name||path.parse(git||url||file.name).name;
  if(s && !update) return errServiceExists(res, name);
  await fetch({git, url, file}, ROOT, name);
  var dir = path.join(ROOT, name);
  var snew = config.defaults(Object.assign({}, config.read(dir), req.body, {name}));
  snew.version = Math.max(snew.version, s? s.version+1:0);
  snew.env['SERVICE'] = name;
  snew.env['DEVICE'] = global.DEVICE;
  snew.env['QUERY'] = global.QUERY;
  config.write(dir, snew);
  res.json(services[name] = snew);
  docker.buildImage()
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
// TODO:
app.post('/:name/run', wrap(async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var pname = name+'.'+dockerNames.getRandomName();
  var o = Object.assign(req.body, services[name]);
  var cmd = await commandRun(o, pname);
  var {stdout, stderr} = await cp.exec(cmd);
  var id = (stdout||stderr).trim();
  if(o.copyfs) await fs.symlink(path.join(PROOT, pname), path.join(PROOT, id));
  res.json({id, name: pname});
  if(!QUERY) return;
  var data = Object.assign({address: o.env['ADDRESS']}, o);
  await needle('post', `http://${QUERY}/${pname}`, data, {json: true});
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
config.readAll(ROOT, services);
module.exports = app;
