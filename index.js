const fileUpload = require('express-fileupload');
const dockerNames = require('docker-names');
const express = require('extra-express');
const fs = require('extra-fs');
const decompress = require('extra-decompress');
const http = require('http');
const path = require('path');
const config = require('./src/config');
const container = require('./src/container');
const image = require('./src/image');
const cp = require('extra-cp');
const os = require('os');



const NOOPTIONS = ['changes', 'export', 'start'];
const ASSETS = path.join(__dirname, 'assets');
const CONFIG = path.join(process.cwd(), '_data', 'config.json');
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(fileUpload());
app.use((req, res, next) => {
  Object.assign(req.body, req.query);
  var {ip, method, url, body} = req;
  if(method!=='GET') console.log(ip, method, url, body);
  next();
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

app.post('/exec', (req, res) => {
  var {cmd} = req.body;
  cp.exec(cmd).then(o => res.json(o), o => res.json(o));
});

app.get('/config', express.async(async (req, res) => {
  res.json(await config.read(CONFIG));
}));
app.post('/config', express.async(async (req, res) => {
  res.json(await config.write(CONFIG, req.body));
}));

app.get('/image', express.async(async (req, res) => {
  res.json(await image.ls(req.body));
}));
app.post('/image', express.async(async (req, res) => {
  var {id, gitUrl, fileUrl} = req.body;
  var {fileUpload} = req.files||{};
  id = id||path.parse(gitUrl||fileUrl||fileUpload.name).name;
  var tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'image-'));
  await decompress({gitUrl, fileUrl, fileUpload}, tmp);
  var opt = Object.assign(req.body, (await image.exists(id))? await image.config(id):null);
  opt = Object.assign(await config.read(CONFIG), opt, req.body);
  console.log('Building image', id);
  var out = await image.build(id, tmp, opt);
  await fs.remove(tmp);
  res.json(out);
}));
app.post('/image/:id/run', express.async(async (req, res) => {
  var {id} = req.params, {name} = req.body;
  name = name||(id+'.'+dockerNames.getRandomName());
  var {stdout} = await image.run(id, name, req.body);
  res.json({id: stdout.trim(), name});
}));
app.delete('/image/:id', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await image.remove(id, req.body));
}));
app.get('/image/:id/config', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await image.config(id, req.body));
}));
app.post('/image/:id/config', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await image.setConfig(id, req.body));
}));
app.get('/image/:id/logs', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await image.logs(id));
}));
app.all('/image/:id/:action', express.async(async (req, res) => {
  var {id, action} = req.params;
  res.json(await image.command(id, action, true, req.body));
}));

app.get('/container', express.async(async (req, res) => {
  res.json(await container.ls(req.body));
}));
app.delete('/container/:id', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await container.command(id, 'stop', req.body));
}));
app.get('/container/:id/config', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await container.config(id, req.body));
}));
app.post('/container/:id/exec', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await container.exec(id, req.body));
}));
app.all('/container/:id/:action', express.async(async (req, res) => {
  var {id, action} = req.params;
  res.json(await container.command(id, action, req.body));
}));

app.use((err, req, res, next) => {
  console.error(err, err.stack);
  res.status(err.statusCode||500).send(err.json||err);
});
app.use(express.static(ASSETS, {extensions: ['html']}));
server.listen(config.PORT, () => console.log('DEVICE running at '+config.DEVICE));
fs.mkdirpSync(path.join(process.cwd(), '_data/image'));
fs.copyFileSync(path.join(__dirname, 'config.json'), CONFIG);
