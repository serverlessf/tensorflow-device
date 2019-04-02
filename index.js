const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const webexec = require('./web/exec');
const webos = require('./web/os');
const webprocess = require('./web/process');
const webservice = require('./web/service');



const PORT = '8080';
const app = express();



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use((req, res, next) => { Object.assign(req.body, req.query); next(); });
app.use('/service', webservice);
app.use('/process', webprocess);
app.use('/exec', webexec);
app.use('/os', webos);
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.statusCode||500).send(err.json||err);
})
app.use(express.static(__dirname+'/assets', {extensions: ['html']}));



const server = http.createServer(app);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
