const http = require('http');
const web = require('./web');


const PORT = '8080';



const server = http.createServer(web);
server.on('clientError', (err, soc) => {
  soc.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(PORT, () => {
  console.log('DEVICE running on port '+PORT);
});
