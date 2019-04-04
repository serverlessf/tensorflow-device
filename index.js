const ip = require('ip');
const web = require('./web');
const http = require('http');



const E = process.env;
global.PORT = E['PORT']||'8000';



const server = http.createServer(web);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(global.PORT, () => {
  global.DEVICE = ip.address()+':'+global.PORT;
  console.log('DEVICE running on '+global.DEVICE);
});
