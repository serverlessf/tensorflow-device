const express = require('express');
const os = require('os');



const app = express();
const FN = [
  'arch', 'cpus', 'endianness', 'freemem', 'homedir', 'hostname',
  'loadavg', 'networkInterfaces', 'platform', 'release', 'tmpdir',
  'totalmem', 'type', 'uptime', 'userInfo'
];



app.get('/', (req, res) => {
  var out = {};
  for(var fn of FN)
    out[fn] = os[fn]();
  res.json(out);
});
app.get('/:fn', (req, res) => {
  var {fn} = req.params;
  if(FN.includes(fn)) return res.json(os[fn]());
  res.status(404).json('Unknown function '+fn);
});
module.exports = app;
