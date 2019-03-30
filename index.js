const fileUpload = require('express-fileupload');
const findFreePort = require('find-free-port');
const bodyParser = require('body-parser');
const decompress = require('decompress');
const download = require('download');
const Docker = require('dockerode');
const express = require('express');
const fs = require('fs-extra');
const cp = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');



const PORT = '8080';
const MODELPATH = __dirname+'/data/model';
const SERVICEPATH = __dirname+'/data/service';
const CONFIGFILE = 'config.json';
// rename
//   search: ['limit'], // term
// export
// exec
// cp
const LOCALHOST = '127.0.0.1';
const USERPORTS = [1024, 65535];
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const NOP = () => 0;
const app = express();
const docker = new Docker();
const models = {};
const services = {};



const errNoModel = (res, name) => res.status(404).json('Cant find model '+name);
const errModelExists = (res, name) => res.status(405).json('Model '+name+' already exists');
const errNoService = (res, name) => res.status(404).json('Cant find service '+name);
const errServiceExists = (res, name) => res.status(405).json('Service '+name+' already exists');



function configRead(dir) {
  var config = path.join(dir, CONFIGFILE);
  return fs.existsSync(config)? JSON.parse(fs.readFileSync(config, 'utf8')) : {};
}

function configWrite(dir, value) {
  var config = path.join(dir, CONFIGFILE);
  fs.writeFile(config, JSON.stringify(value, null, 2), NOP);
}

function configsRead(dir, configs={}) {
  for(var name of fs.readdirSync(dir))
    configs[name] = Object.assign({name}, configRead(path.join(dir, name)));
  return configs;
}

async function dirDehusk(dir) {
  var ents = fs.readdirSync(dir, {withFileTypes: true});
  if(ents.length>1 || ents[0].isFile()) return;
  var temp = dir+'.temp', seed = path.join(temp, ents[0].name);
  await fs.move(dir, temp);
  await fs.move(seed, dir);
  await fs.remove(temp);
};

function downloadGit(dir, name, url) {
  var cmd = `git clone --depth=1 ${url} ${name}`;
  return new Promise((fres, frej) => cp.exec(cmd, {cwd: dir}, (err, stdout, stderr) => err? frej(stderr) : fres(stdout)));
}

async function downloadUrl(dir, name, url) {
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(url));
  fs.mkdirSync(pkg, {recursive: true});
  await download(url, pkg, {extract: true});
  await fs.remove(out);
  await dirDehusk(pkg);
}

async function downloadFile(dir, name, file) {
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(file.name));
  fs.mkdirSync(pkg, {recursive: true});
  await new Promise((fres, frej) => file.mv(out, (err) => err? frej(err) : fres()));
  await decompress(out);
  await fs.remove(out);
  await dirDehusk(pkg);
};

function downloadAny(dir, name, options) {
  var {git, url, file} = options||{};
  if(git) return downloadGit(dir, name, git);
  if(url) return downloadUrl(dir, name, url);
  return downloadFile(dir, name, file);
}



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use((req, res, next) => { Object.assign(req.body, req.query); next(); });

app.get('/model', (req, res) => {
  res.json(models);
});
app.post('/model', (req, res) => {
  var {name, git, url} = req.body, file = (req.files||{}).model;
  if(models[name]) return errModelExists(res, name);
  downloadAny(MODELPATH, name, {git, url, file}).then(() => {
    var dir = path.join(MODELPATH, name);
    models[name] = Object.assign(configRead(dir), {name});
    res.json(models[name]);
  });
});
app.delete('/model/:name', (req, res) => {
  var {name} = req.params;
  if(!models[name]) return errNoModel(res, name);
  fs.remove(path.join(MODELPATH, name));
  res.json(models[name] = null);
});
app.get('/model/:name', (req, res) => {
  var {name} = req.params;
  if(!models[name]) return errNoModel(res, name);
  res.json(models[name]);
});
app.post('/model/:name', (req, res) => {
  var {name} = req.params;
  if(!models[name]) return errNoModel(res, name);
  configWrite(path.join(MODELPATH, name), Object.assign(models[name], req.body, {name}));
  res.json(models[name]);
});
app.post('/model/:name/run', (req, res) => {
  var {name} = req.params;
  if(!models[name]) return errNoModel(res, name);
  findFreePort(USERPORTS[0], USERPORTS[1], LOCALHOST, 2, (err, p1, p2) => {
    if(err) return res.status(400).json(err);
    var cmd = `docker run -d -p ${p1}:8500 -p ${p2}:8501 \
    --mount type=bind,source=${MODELPATH}/${name},target=/models/model \
    -e MODEL_NAME=model -t tensorflow/serving`;
    cp.exec(cmd, (err, stdout, stderr) => {
      if(err) return res.status(400).json(stderr);
      var id = (stdout||stderr).trim(), model = models[name];
      model.processes = model.processes||[];
      model.processes.push(id);
      configWrite(path.join(MODELPATH, name), model);
      res.json(id);
    });
  });
});


app.get('/service', (req, res) => {
  res.json(services);
});
app.post('/service', (req, res) => {
  var {name, git, url} = req.body, file = (req.files||{}).service;
  if(services[name]) return errServiceExists(res, name);
  downloadAny(SERVICEPATH, name, {git, url, file}).then(() => {
    var dir = path.join(SERVICEPATH, name);
    services[name] = Object.assign(configRead(dir), {name});
    res.json(services[name]);
  });
});
app.delete('/service/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  fs.remove(path.join(SERVICEPATH, name));
  res.json(services[name] = null);
});
app.get('/service/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  res.json(services[name]);
});
app.post('/service/:name', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  configWrite(path.join(SERVICEPATH, name), Object.assign(services[name], req.body, {name}));
  res.json(services[name]);
});
// TODO: CP, EXEC
// services and models are very identical
// except for run!
app.post('/service/:name/run', (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  findFreePort(1024, 65535, '127.0.0.1', 2, (err, p1, p2) => {
    if(err) return res.status(400).json(err);
    var cmd = `docker run -d -p ${p1}:8500 ${p2}:8501 \
    --mount type=bind,source=${MODELPATH}/${name},target=/models/model \
    -e MODEL_NAME=model -t tensorflow/serving`;
    cp.exec(cmd, (err, stdout, stderr) => {
      if(err) return res.status(400).json(err);
      var id = (stdout||stderr).trim(), model = models[name];
      model.processes = model.processes||[];
      model.processes.push(id);
      configWrite(path.join(MODELPATH, name), model);
      res.json(id);
    });
  });
});


// use status code?
app.get('/process', (req, res) => {
  var options = req.body;
  docker.listContainers(options, (err, data) => res.json({err, data}));
});
app.get('/process/:id', (req, res) => {
  var {id} = req.params, options = req.body;
  docker.listContainers(options, (err, containers) => {
    var container = containers.find(c => c.Id===id);
    res.json({err: container? null : 'No such process '+id, data: container});
  });
});
app.delete('/process/:id', (req, res) => {
  var {id} = req.params, options = req.body;
  docker.getContainer(id).stop(options, (err, data) => res.json({err, data}));
});
app.all('/process/:id/:fn', (req, res) => {
  var {id, fn} = req.params, options = req.body;
  docker.getContainer(id)[fn](options, (err, data) => res.json({err, data}));
});


app.post('/shell', (req, res) => {
  var {command} = req.body;
  console.log('command:', command);
  cp.exec(command, (err, stdout, stderr) => {
    res.json({err, stdout, stderr});
  });
});
app.get('/os', (req, res) => {
  var out = {};
  for(var fn of OSFN)
    out[fn] = os[fn]();
  res.json(out);
});
app.get('/os/:fn', (req, res) => {
  var {fn} = req.params;
  if(OSFN.includes(fn)) return res.json(os[fn]());
  res.json({err: 'unknown function '+fn});
});
// we are not serving static files yet!



fs.mkdirSync(MODELPATH, {recursive: true});
fs.mkdirSync(SERVICEPATH, {recursive: true});
configsRead(MODELPATH, models);
configsRead(SERVICEPATH, services);
const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
