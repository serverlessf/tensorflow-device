const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const Docker = require('dockerode');
const express = require('express');
Array = require('extra-array');
const cp = require('extra-cp');
const fs = require('fs-extra');
const config = require('./config');
const fetch = require('./fetch');
const path = require('path');



const REFS = /\/.*?\/fs/;
const ROOT = config.PROOT;

const app = express();
const docker = new Docker();
const wrap = (fn) => ((req, res, next) => fn(req, res, next).then(null, next));



function commandOptions(options, values=[], exclude=[]) {
  var o = options||{}, out = '';
  for(var k in o) {
    if(exclude.includes(k)) continue;
    if(!values.includes(k)) out += ` --${k}`;
    else out += ` --${k}`;
  }
  return out.trimStart();
};



app.get('/', wrap(async (req, res) => {
  var options = req.body, filters = (options||{}).filters||{};
  for(var k in filters)
    filters[k] = Array.ensure(filters[k]);
  res.json(await docker.listContainers(options));
}));
app.post('/', wrap(async (req, res) => {
  var {id, name, git, url} = req.body;
  var {file} = req.files||{};
  name = name||id||path.parse(git||url||file.name).name;
  var dir = path.join(ROOT, name);
  await fetch(dir, {git, url, file});
  var p = await config.read(dir, req.body);
  res.json(await config.write(dir, p));
}));
app.post('/prune', wrap(async (req, res) => {
  var options = req.body;
  res.json(await docker.pruneContainers(options));
}));
app.get('/:id', wrap(async (req, res) => {
  var {id} = req.params, options = req.body;
  res.json(await docker.getContainer(id).inspect(options));
}));
app.delete('/:id', wrap(async (req, res) => {
  var {id} = req.params, options = req.body;
  res.json(await docker.getContainer(id).stop(options));
}));
app.post('/:id/exec', async (req, res) => {
  var {id} = req.params, options = req.body||{}, cmd = options.cmd||'';
  var opts = commandOptions(options, [], ['cmd'])
  res.json(await cp.exec(`docker exec ${opts} ${id} ${cmd}`));
});
app.get('/:id/export', wrap(async (req, res) => {
  var {id} = req.params;
  res.writeHead(200, {'content-type': 'application/x-tar'});
  (await docker.getContainer(id).export()).pipe(res);
}));
app.get('/:id/fs*', (req, res) => {
  req.url = req.url.replace(REFS, '')||'/';
  var done = finalhandler(req, res);
  var {id} = req.params, ppath = path.join(ROOT, id);
  var index = serveIndex(ppath, {icons: true}), static = serveStatic(ppath);
  static(req, res, (err) => err? done(err):index(req, res, done));
});
app.post('/:id/fs*', wrap(async (req, res) => {
  var {id} = req.params, {file} = req.files;
  var rel = req.url.replace(REFS, '')||'/';
  var abs = path.join(ROOT, id, rel);
  await file.mv(abs); res.json(file.size);
}));
app.delete('/:id/logs', wrap(async (req, res) => {
  var {id} = req.params, options = req.body;
  var cmd = `sudo sh -c "truncate -s 0 /var/lib/docker/containers/*/*-json.log"`;
  var opts = commandOptions(options, [], ['cmd'])
  res.json(await cp.exec(`docker exec ${opts} ${id} ${cmd}`));
}));
app.all('/:id/:fn', wrap(async (req, res) => {
  var {id, fn} = req.params;
  var options = ['changes'].includes(fn)? undefined:req.body;
  var data = await docker.getContainer(id)[fn](options);
  return res.json(data);
}));
fs.mkdirSync(ROOT, {recursive: true});
module.exports = app;
