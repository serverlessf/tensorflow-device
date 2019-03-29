const bodyParser = require('body-parser');
const Docker = require('dockerode');
const express = require('express');
const cp = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');



const PORT = '8080';
const MODELS = './models';
// rename
//   search: ['limit'], // term
// export
// exec
// cp

const PARAMS_VALUED = {
  kill: ['signal'],
  logs: ['tail'],
  restart: ['time'],
  stop: ['time']
};
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const app = express();
const docker = new Docker();



function cmdArgs(params={}, valued=[]) {
  var args = '';
  for(var k in params)
    args += valued.includes(k)? ` --${k} ${params[k]}` : ` --${k}`;
  return args;
};



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use((req, res, next) => { Object.assign(req.body, req.query); next(); });

app.get('/model', (req, res) => {
  fs.readdir(MODELS, (err, files) => res.json(files));
});
app.post('/model', (req, res) => {
  var {name, url, git} = req.body;
  console.log('git', req.query)
  if(git) return cp.exec(`git clone --depth=1 ${git} ${name}`, {cwd: MODELS}, (err, stdout, stderr) => {
    res.json(err? {err: stderr} : {err});
  });
});
app.delete('/model/:name', (req, res) => {

});
app.post('/model/:name/run', (req, res) => {
  var {name} = req.params;
  var command = `docker run -d -p 8500:8500 \
  --mount type=bind,source=${MODELS}/${name},target=/models/model \
  -e MODEL_NAME=model -t tensorflow/serving >model.log 2>&1`;
  cp.exec(command, (err, stdout, stderr) => {
  });
});

// app.get('/process/:id/logs', (req, res) => {
//   var {id} = req.params;
//   cp.exec('docker logs '+cmdArgs(req.body, ['tail'])+' '+id, (err, stdout, stderr) => {
//     res.json({err, stdout, stderr});
//   });
// });

// app.all('/process/:id/:command', (req, res) => {
//   var {id, command} = req.params;
//   cp.exec('docker '+command+cmdArgs(req.body, ['tail'])+' '+id, (err, stdout, stderr) => {
//     res.json({err, stdout, stderr});
//   });
// });

app.get('/process', (req, res) => {
  docker.listContainers((err, containers) => {
    res.json(containers);
  });
});
app.get('/process/:id', (req, res) => {
  var {id} = req.params;
  docker.listContainers((err, containers) => {
    for(var container of containers)
      if(container.Id===id) return res.json(container);
    res.json({err: 'No such process '+id});
  });
});
app.all('/process/:id/stats', (req, res) => {
  var {id} = req.params;
  docker.getContainer(id).logs({stdout: true, stderr: true}, (err, logs) => {
    res.json(logs);
  });
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



fs.mkdirSync(MODELS, {recursive: true});
const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
