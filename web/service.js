const findFreePort = require('find-free-port');
const dockerNames = require('docker-names');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const Docker = require('dockerode');
const express = require('express');
const cp = require('extra-cp');
const fs = require('fs-extra');
const config = require('../config');
const fetch = require('../fetch');
const path = require('path');



const REFS = /\/service\/.*?\/fs/;
const ROOT = __dirname+'/_data/service';
const PROOT = __dirname+'/_data/process';

const app = express();
const docker = new Docker();
const services = {};

const errNoService = (res, name) => res.status(404).json('Cant find service '+name);
const errServiceExists = (res, name) => res.status(405).json('Service '+name+' already exists');
const wrap = (fn) => ((req, res, next) => (
  fn(req, res, next).then(null, next)
));



async function commandRun(o, pname) {
  var ppath = o.copyfs? path.join(PROOT, pname):o.path;
  if(o.copyfs) await fs.copy(o.path, ppath);
  var workdir = `-w ${o.workdir}`, name = `--name ${pname}`;
  var freePorts = await findFreePort(1024, 65535, '127.0.0.1', o.ports.length);
  var ports = o.ports.reduce((str, port, i) => str+` -p ${freePorts[i]}:${port}`, '');
  var mounts = o.mounts.reduce((str, mount) => str+` --mount ${mount}`, '');
  var env = Object.keys(o.env).reduce((str, k) => str+` -e ${k}=${o.env[k]}`, '');
  var image = o.engine, cmd = o.cmd.join(' ');
  mounts = mounts.replace(/\$\{path\}/g, ppath);
  return `docker run -d ${workdir} ${name} ${ports} ${mounts} ${env} -it ${image} ${cmd}`;
};



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use((req, res, next) => { Object.assign(req.body, req.query); next(); });

app.get('/service', (req, res) => {
  res.json(services);
});
app.post('/service', wrap(async (req, res) => {
  var {name, git, url} = req.body;
  var file = (req.files||{}).service;
  name = name||path.parse(git||url||file.name).name;
  if(services[name]) return errServiceExists(res, name);
  await fetch({git, url, file}, ROOT, name);
  var dir = path.join(ROOT, name);
  services[name] = Object.assign({name}, config.read(dir), req.body, {name});
  res.json(services[name]);
}));
app.delete('/service/:name', wrap(async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var jobs = [fs.remove(path.join(ROOT, name))];
  var cs = await docker.listContainers();
  for(var c of cs.filter(c => c.Names[0].includes(name)))
    jobs.push(docker.getContainer(c.Id).stop(req.body));
  await Promise.all(jobs);
  res.json(services[name] = null);
}));
app.get('/service/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  res.json(services[name]);
});
app.post('/service/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  config.write(path.join(ROOT, name), Object.assign(services[name], req.body, {name}));
  res.json(services[name]);
});
app.get('/service/:name/fs*', (req, res) => {
  req.url = req.url.replace(REFS, '')||'/';
  var done = finalhandler(req, res);
  var {name} = req.params, spath = path.join(ROOT, name);
  var index = serveIndex(spath, {icons: true}), static = serveStatic(spath);
  static(req, res, (err) => err? done(err):index(req, res, done));
});
app.post('/service/:name/fs*', wrap(async (req, res) => {
  var {name} = req.params, {file} = req.files;
  var rel = req.url.replace(REFS, '')||'/';
  var abs = path.join(ROOT, name, rel);
  await file.mv(abs);
  res.json(file.size);
}));
app.post('/service/:name/run', wrap(async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var pname = name+'.'+dockerNames.getRandomName();
  var o = Object.assign(req.body, services[name]);
  var cmd = await commandRun(o, pname);
  var {stdout, stderr} = await cp.exec(cmd);
  var id = (stdout||stderr).trim();
  if(o.copyfs) await fs.symlink(path.join(PROOT, pname), path.join(PROOT, id));
  res.json({id, name: pname});
}));
fs.mkdirSync(ROOT, {recursive: true});
config.readAll(ROOT, services);
module.exports = app;
