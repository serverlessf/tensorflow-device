const Docker = require('dockerode');
const express = require('express');
const path = require('path');



const app = express();
const docker = new Docker();



app.get('', async (req, res) => {
  var options = req.body, filters = (options||{}).filters||{};
  for(var k in filters)
    filters[k] = arrayEnsure(filters[k]);
  var data = await docker.listContainers(options);
  res.json(data);
});
app.get('/:id', async (req, res) => {
  var {id} = req.params, options = req.body;
  var data = await docker.getContainer(id).inspect(options);
  res.json(data);
});
app.delete('/:id', async (req, res) => {
  var {id} = req.params, options = req.body;
  await docker.getContainer(id).stop(options);
  res.json(null);
});
app.post('/:id/exec', async (req, res) => {
  var {id} = req.params, options = req.body||{}, cmd = options.cmd||'';
  var opts = commandOptions(req.body, [], ['cmd'])
  var {stdout, stderr} = await cpExec(`docker exec ${opts} ${id} ${cmd}`);
  res.json({stdout, stderr});
});
app.get('/:id/export', async (req, res) => {
  var {id} = req.params;
  var stream = await docker.getContainer(id).export();
  res.writeHead(200, {'content-type': 'application/x-tar'});
  stream.pipe(res);
});
app.get('/:id/fs*', (req, res) => {
  req.url = req.url.replace(/\/process\/.*?\/fs/, '')||'/';
  var done = finalhandler(req, res);
  var {id} = req.params, ppath = path.join(PROCESSPATH, id);
  var index = serveIndex(ppath, {icons: true}), static = serveStatic(ppath);
  static(req, res, (err) => err? done(err):index(req, res, done));
});
app.post('/:id/fs*', async (req, res) => {
  var {id} = req.params, {file} = req.files;
  var rel = req.url.replace(/\/process\/.*?\/fs\//, '')||'/';
  var abs = path.join(PROCESSPATH, id, rel);
  await file.mv(abs);
  res.json(file.size);
});
app.all('/:id/:fn', async (req, res) => {
  var {id, fn} = req.params;
  var options = ['changes'].includes(fn)? undefined:req.body;
  docker.getContainer(id)[fn](options, (err, data) => {
    if(err) res.status(400).json({err});
    return fn==='logs'? res.send(data):res.json(data);
  });
});
module.exports = app;
