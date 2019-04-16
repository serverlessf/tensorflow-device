const fileUpload = require('express-fileupload');
const dockerNames = require('docker-names');
const express = require('extra-express');
const fs = require('extra-fs');
const decompress = require('extra-decompress');
const cp = require('extra-cp');
const boolean = require('boolean');
const http = require('http');
const path = require('path');
const config = require('./src/config');
const container = require('./src/container');
const image = require('./src/image');
const device = require('./src/device');



const ASSETS = path.join(__dirname, 'assets');
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

app.get('/status', express.async(async (req, res) => {
  var write = boolean(req.body.write);
  res.json(await device.status(write? {}:null));
}));
app.post('/status', express.async(async (req, res) => {
  res.json(await device.setStatus(req.body));
}));

app.post('/exec', (req, res) => {
  var {cmd} = req.body;
  cp.exec(cmd).then(o => res.json(o), o => res.json(o));
});

app.get('/image', express.async(async (req, res) => {
  res.json(await image.ls(req.body));
}));
app.post('/image', express.async(async (req, res) => {
  var {id, gitUrl, fileUrl} = req.body;
  var {fileUpload} = req.files||{};
  id = id||path.parse(gitUrl||fileUrl||fileUpload.name).name;
  var tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'image-'));
  await decompress({gitUrl, fileUrl, fileUpload}, tmp);
  var exists = await image.exists(id);
  var o = exists? await image.config(id):{};
  var version = o.version||0;
  o = Object.assign(await config.read(CONFIG), o, req.body);
  o.version = Math.max(o.version||0, version+1);
  console.log('Building image', id, o.version);
  var out = await image.build(id, tmp, o);
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
app.get('/image/:id/status', express.async(async (req, res) => {
  var {id} = req.params, write = boolean(req.body.write);
  res.json(await image.status(id, device.status({}), write? {}:null));
}));
app.post('/image/:id/status', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await image.setStatus(id, req.body));
}));
app.get('/image/:id/logs', express.async(async (req, res) => {
  var {id} = req.params, {stderr} = req.body;
  res.json(stderr? '':await image.logs(id));
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
  res.json(await container.remove(id, req.body));
}));
app.get('/container/:id/status', express.async(async (req, res) => {
  var {id} = req.params, write = boolean(req.body.write);
  var c = await container.status(id, {}, write? {}:null);
  res.json(Object.assign(await image.status(c.image, device.status({}), {}), c));
}));
app.post('/container/:id/status', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await container.setStatus(id, req.body));
}));
app.post('/container/:id/exec', express.async(async (req, res) => {
  var {id} = req.params;
  res.json(await container.exec(id, req.body));
}));
app.get('/container/:id/export', express.async(async (req, res) => {
  var {id} = req.params;
  res.writeHead(200, {'content-type': 'application/x-tar'});
  (await container.command(id, 'export', req.body)).pipe(res);
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
