const express = require('express');
const {cpExec} = require('../util');



const app = express();



app.post('/', (req, res) => {
  var {cmd} = req.body;
  cpExec(cmd).then(o => res.json(o), o => res.json(o));
});
module.exports = app;
