const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const express = require('express');
const webexec = require('./exec');
const webos = require('./os');
const webprocess = require('./process');
const webservice = require('./service');



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
