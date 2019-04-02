const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const Docker = require('dockerode');
const express = require('express');
Array = require('extra-array');
const cp = require('extra-cp');
const fs = require('fs-extra');
const path = require('path');



const REFS = /\/process\/.*?\/fs/;
const ROOT = __dirname+'/_data/process';

const app = express();
const docker = new Docker();

const wrap = (fn) => ((req, res, next) => (
  fn(req, res, next).then(null, next)
));



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
  var opts = commandOptions(req.body, [], ['cmd'])
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
app.all('/:id/:fn', wrap(async (req, res) => {
  var {id, fn} = req.params;
  var options = ['changes'].includes(fn)? undefined:req.body;
  var data = await docker.getContainer(id)[fn](options);
  return fn==='logs'? res.send(data):res.json(data);
}));
fs.mkdirSync(ROOT, {recursive: true});
module.exports = app;
