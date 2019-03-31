const fileUpload = require('express-fileupload');
const findFreePort = require('find-free-port');
const dockerNames = require('docker-names');
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
const SERVICEPATH = __dirname+'/_data/service';
const PROCESSPATH = __dirname+'/_data/process';
const CONFIG = __dirname+'/_data/config.json';
const CONFIGFILE = 'config.json';
// exec
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const STDIO = [];
const NOP = () => 0;

const app = express();
const docker = new Docker();
const services = {};



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
// icon
// version
// description
// scripts
// repository
// keywords
// author
// license
// engine
// main
// cmd
// env
// copyfs
// mounts
// ports
// processes XX
// give process name


function arrayEnsure(val) {
  if(val==null) return [];
  return Array.isArray(val)? val:[val];
};

function cpExec(cmd, o) {
  var o = o||{}, stdio = o.log? o.stdio||STDIO:o.stdio||[];
  if(o.log) console.log('-cpExec:', cmd);
  if(o.stdio==null) return Promise.resolve({stdout: cp.execSync(cmd, {stdio}).toString()});
  return new Promise((fres, frej) => cp.exec(cmd, {stdio}, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout: stdout.toString(), stderr: stderr.toString()});
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

function configTfServing(o) {
  o.ports = [8500, 8501];
  o.mounts = ['type=bind,source=${path},target=/models/model'];
  o.env = o.env||{};
  o.env['MODEL_NAME'] = 'model';
  return o;
};

function configLang(o) {
  o.copyfs = true;
  o.ports = o.ports||[8000];
  o.mounts = ['type=bind,source=${path},target=/usr/src/app'];
  o.env = o.env||{};
  o.env['DEVICE'] = `127.0.0.1:${PORT}`;
  o.env['QUERY'] = `TODO`;
  o.env['SERVICE'] = o.name;
  o.env['PROCESS'] = `TODO`;
  o.env['PORT'] = o.ports[0].toString();
  o.workdir = o.workdir||'/usr/src/app';
  o.cmd = o.cmd||['sh', 'start.sh'];
  return o;
};

function configDef(o) {
  const keys = ['ports', 'mounts', 'env', 'cmd'];
  o.path = path.join(SERVICEPATH, o.name);
  o.version = o.version||0;
  o.engine = o.engine||'python:3';
  for(var k of keys) {
    var v = o[k]||null;
    o[k] = typeof v==='string'? v.split(';'):v;
  }
  if(o.engine==='tensorflow/serving') return configTfServing(o);
  return configLang(o);
};

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

async function commandRun(o) {
  var pname = o.name+'.'+dockerNames.getRandomName();
  var ppath = o.copyfs? path.join(PROCESSPATH, pname):o;
  if(o.copyfs) await fs.copy(o.path, ppath);
  await fs.copy(__dirname+'/scripts/run_python3.sh', path.join(ppath, 'start.sh'));
  var workdir = `-w ${o.workdir}`, name = `--name ${pname}`;
  var freePorts = await findFreePort(1024, 65535, '127.0.0.1', o.ports.length);
  var ports = o.ports.reduce((str, port, i) => str+` -p ${freePorts[i]}:${port}`, '');
  var mounts = o.mounts.reduce((str, mount) => str+` --mount ${mount}`, '');
  var env = Object.keys(o.env).reduce((str, k) => str+` -e ${k}=${o.env[k]}`, '');
  var image = o.engine, cmd = o.cmd.join(' ');
  mounts = mounts.replace(/\$\{path\}/g, ppath);
  return `docker run -d ${workdir} ${name} ${ports} ${mounts} ${env} -it ${image} ${cmd}`;
};

function commandOptions(options, values=[], exclude=[]) {
  var o = options||{}, out = '';
  for(var k in o) {
    if(exclude.includes(k)) continue;
    if(!values.includes(k)) out += ` --${k}`;
    else out += ` --${k}`;
  }
  return out.trimStart();
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
app.get('/service/:name/fs/*', (req, res) => {
  var {name} = req.params;
  var rel = req.url.replace(/\/service\/.*?\/fs\//, '');
  var abs = path.join(SERVICEPATH, name, rel);
  return res.sendFile(abs);
});
app.post('/service/:name/fs/*', async (req, res) => {
  var {name} = req.params, {file} = req.files;
  var rel = req.url.replace(/\/service\/.*?\/fs\//, '');
  var abs = path.join(SERVICEPATH, name, rel);
  await file.mv(abs);
  res.json(file.size);
});
app.post('/service/:name/run', async (req, res) => {
  var {name} = req.params, service = services[name];
  if(!service) return errNoService(res, name);
  var o = configDef(Object.assign(req.body, service));
  var cmd = await commandRun(o);
  console.log({cmd});
  var {stdout, stderr} = await cpExec(cmd);
  var id = (stdout||stderr).trim();
  service.processes = service.processes||[];
  service.processes.push(id);
  var spath = path.join(SERVICEPATH, name);
  configWrite(spath, service);
  res.json(id);
});


// use status code?
app.get('/process', async (req, res) => {
  var options = req.body, filters = (options||{}).filters||{};
  for(var k in filters)
    filters[k] = arrayEnsure(filters[k]);
  var data = await docker.listContainers(options);
  res.json(data);
});
app.get('/process/:id', async (req, res) => {
  var {id} = req.params, options = req.body;
  var data = await docker.getContainer(id).inspect(options);
  res.json(data);
});
app.delete('/process/:id', async (req, res) => {
  var {id} = req.params, options = req.body;
  await docker.getContainer(id).stop(options);
  res.json(null);
});
app.post('/process/:id/exec', async (req, res) => {
  var {id} = req.params, options = req.body||{}, cmd = options.cmd||'';
  var opts = commandOptions(req.body, [], ['cmd'])
  var {stdout, stderr} = await cpExec(`docker exec ${opts} ${id} ${cmd}`);
  res.json({stdout, stderr});
});
app.get('/process/:id/export', async (req, res) => {
  var {id} = req.params;
  var stream = await docker.getContainer(id).export();
  res.writeHead(200, {'content-type': 'application/x-tar'});
  stream.pipe(res);
});
app.get('/process/:id/fs/*', (req, res) => {
  var {id} = req.params;
  var rel = req.url.replace(/\/process\/.*?\/fs\//, '');
  var abs = path.join(PROCESSPATH, id, rel);
  return res.sendFile(abs);
});
app.post('/process/:id/fs/*', async (req, res) => {
  var {id} = req.params, {file} = req.files;
  var rel = req.url.replace(/\/service\/.*?\/fs\//, '');
  var abs = path.join(PROCESSPATH, id, rel);
  await file.mv(abs);
  res.json(file.size);
});
app.all('/process/:id/:fn', async (req, res) => {
  var {id, fn} = req.params;
  var options = ['changes'].includes(fn)? undefined:req.body;
  var data = await docker.getContainer(id)[fn](options);
  res.json(data);
});


app.post('/shell', async (req, res) => {
  var {command} = req.body;
  var {stdout, stderr} = await cpExec(command);
  res.json({stdout, stderr});
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
  res.status(404).json('Unknown function '+fn);
});
// we are not serving static files yet!



fs.mkdirSync(SERVICEPATH, {recursive: true});
fs.mkdirSync(PROCESSPATH, {recursive: true});
configsRead(SERVICEPATH, services);
const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
