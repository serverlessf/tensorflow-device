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
const SERVICEPATH = __dirname+'/data/service';
const MODELPATH = SERVICEPATH;
const CONFIGFILE = 'config.json';
// rename
//   search: ['limit'], // term
// export
// exec
// cp
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const STDIO = [0, 1, 2];
const NOP = () => 0;

const app = express();
const docker = new Docker();
const services = {};
const models = services;



const errNoService = (res, name) => (
  res.status(404).json('Cant find service '+name)
);
const errServiceExists = (res, name) => (
  res.status(405).json('Service '+name+' already exists')
);

const configDefault = () => ({
  engine: 'python:3',
  created: new Date(),
  processes: []
});



// Execute child process, return promise.
function cpExec(cmd, o) {
  var o = o||{}, stdio = o.log? o.stdio||STDIO:o.stdio||[];
  if(o.log) console.log('-cpExec:', cmd);
  if(o.stdio==null) return Promise.resolve({stdout: cp.execSync(cmd, {stdio})});
  return new Promise((fres, frej) => cp.exec(cmd, {stdio}, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
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
  return cpExec(`git clone --depth=1 ${url} ${name}`, {cwd: dir});
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
  await new Promise((fres, frej) => file.mv(out, (err) => err? frej(err):fres()));
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
    configs[name] = Object.assign(configRead(path.join(dir, name)), {name});
  return configs;
}

function configRunOptions(config) {
  var c = config||{}, o = {};
  const keys = ['ports', 'mounts', 'env', 'cmd'];
  o.path = path.join(SERVICEPATH, c.name);
  o.engine = c.engine||'python:3';
  for(var k of keys) {
    var v = c[k]||[];
    o[k] = typeof v==='string'? v.split(';'):v;
  }
  return o;
};

function optionsTensorflowServing(options) {
  var o = options||{};
  o.ports = [8500, 8501];
  o.mounts = [`type=bind,source=${o.path},target=/models/model`];
  o.env['MODEL_NAME'] = 'model';
};

function optionsPython3(options) {
  var o = options||{};
  o.ports = o.ports.length? o.ports:[8000];
  o.mounts = [`type=bind,source=${o.path},target=/usr/src/app`];// !!!
  o.env['PORT'] = o.ports[0].toString();
  o.cmd = ['sh', '/usr/src/app/run.sh'];// !!!
};

async function optionsCommand(options) {
  var {engine, ports, mounts, env, cmd} = options||{};
  var freePorts = await findFreePort(1024, 65535, '127.0.0.1', ports.length);
  var portsStr = ports.reduce((str, port, i) => str+` -p ${freePorts[i]}:${port}`, '');
  var mountsStr = mounts.reduce((str, mount) => str+` --mount ${mount}`, '');
  var envStr = Object.keys(env).reduce((str, k) => str+` -e ${k}=${env[k]}`, '');
  var cmdStr = cmd.join(' ');
  return `docker run -d ${portsStr} ${mountsStr} ${envStr} -it ${engine} ${cmdStr}`;
};



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use((req, res, next) => { Object.assign(req.body, req.query); next(); });

app.get('/service', (req, res) => {
  res.json(services);
});
app.post('/service', async (req, res) => {
  var {name, git, url} = req.body;
  var file = (req.files||{}).service;
  if(services[name]) return errServiceExists(res, name);
  await downloadAny(SERVICEPATH, name, {git, url, file});
  var dir = path.join(SERVICEPATH, name);
  await fs.copyFile(`${__dirname}/scripts/run_python3.sh`, `${dir}/run.sh`); // !!!
  services[name] = Object.assign(configRead(dir), req.body, configDefault());
  res.json(services[name]);
});
app.delete('/service/:name', async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var jobs = [fs.remove(path.join(SERVICEPATH, name))];
  for(var id of services[name].processes)
    jobs.push(docker.getContainer(id).stop(req.body));
  await Promise.all(jobs);
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
// 1. start a container
// 2. copy files to it
// 3. install python dependencies
// 4. start main script
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
app.post('/service/:name/run', async (req, res) => {
  var {name} = req.params;
  if(!services[name]) return errNoService(res, name);
  var o = configRunOptions(Object.assign(req.body, services[name]));
  if(o.engine==='tensorflow/serving') optionsTensorflowServing(o);
  else optionsPython3(o);
  var cmd = await optionsCommand(o);
  console.log({cmd});
  var {stdout, stderr} = await cpExec(cmd);
  var id = (stdout||stderr).toString().trim();
  var service = services[name];
  service.processes = service.processes||[];
  service.processes.push(id);
  var spath = path.join(SERVICEPATH, name);
  configWrite(spath, service);
  if(o.engine==='tensorflow/serving') return res.json(id);
  // console.log(1);
  // await cpExec(`docker cp ${spath} ${id}:/usr/src/app`);
  // console.log(2);
  // await cpExec(`docker cp ${__dirname}/scripts/run_python3.sh ${id}:/usr/src/app/run.sh`);
  // console.log(3);
  // await cpExec(`docker exec -dit -w /usr/src/app ${id} sh run.sh ${(o.args||[]).join(' ')}`);
  // console.log(4);
  res.json(id);
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
