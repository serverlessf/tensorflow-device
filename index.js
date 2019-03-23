const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const cp = require('child_process');



const PORT = '8080';
const app = express();



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.post('/shell', (req, res) => {
  var {command} = req.body;
  console.log('command:', command);
  cp.exec(command, (err, stdout, stderr) => {
    res.send({err, stdout, stderr});
  });
});
// we are not serving static files yet!



const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
