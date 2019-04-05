const net = require('extra-net');
const web = require('./web');
const http = require('http');
const path = require('path');



const E = process.env;
global.IP = net.address().address;
global.PORT = E['PORT']||'8000';
global.DEVICE = global.IP+':'+global.PORT;
global.QUERY = E['QUERY']||'';


const server = http.createServer(web);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(global.PORT, () => {
  console.log('DEVICE running on '+global.DEVICE);
});
