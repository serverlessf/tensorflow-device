const http = require('http');
const web = require('./web');


const E = process.env;
global.PORT = E['PORT']||'8000';



const server = http.createServer(web);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(global.PORT, () => {
  console.log('DEVICE running on port '+global.PORT);
});
