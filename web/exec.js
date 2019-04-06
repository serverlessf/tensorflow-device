const express = require('extra-express');
const cp = require('extra-cp');



const app = express();



app.post('/', (req, res) => {
  var {cmd} = req.body;
  cp.exec(cmd).then(o => res.json(o), o => res.json(o));
});
module.exports = app;
