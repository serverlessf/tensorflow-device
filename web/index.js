const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const express = require('express');
const webexec = require('./exec');
const webos = require('./os');
const webprocess = require('./process');
const webservice = require('./service');
const path = require('path');
const fs = require('fs');



const ROOT = path.dirname(require.main.filename);
const AROOT = path.join(ROOT, 'assets');
const TEMPLATES = {};
const app = express();



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use((req, res, next) => {
  Object.assign(req.body, req.query);
  if(req.method!=='GET') console.log(req.ip, req.method, req.url, req.body);
  next();
});
app.use('/service', webservice);
app.use('/process', webprocess);
app.use('/exec', webexec);
app.use('/os', webos);
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.statusCode||500).send(err.json||err);
})
// app.use((req, res, next) => {
//   var f = path.join(AROOT, req.url);
//   if(!f.endsWith('.html') && !fs.existsSync(f)) return next();
//   res.render(req.url, );
// });
app.use(express.static(ROOT+'/assets', {extensions: ['html']}));
module.exports = app;



for(var f of fs.readdirSync(AROOT)) {
  if(!f.startsWith('_')) continue;
  TEMPLATES[f] = fs.readFileSync(path.join(AROOT, f));
}
