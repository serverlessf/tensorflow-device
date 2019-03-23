const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const cp = require('child_process');
const os = require('os');



const PORT = '8080';
const OSFN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];
const app = express();



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
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
app.get('/os/:func', (req, res) => {
  var {fn} = req.params;
  if(OSFN.includes(fn)) return res.json(os[fn]());
  res.json({err: 'unknown function '+fn});
});
// we are not serving static files yet!



const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
