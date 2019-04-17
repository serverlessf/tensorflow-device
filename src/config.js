const fs = require('extra-fs');
const path = require('path');



const FILE = 'config.json';



async function read(file) {
  // var file = path.join(dir, FILE);
  if(!fs.existsSync(file)) return {};
  var data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function write(file, value) {
  // var file = path.join(dir, FILE);
  await fs.mkdirp(path.dirname(file));
  var value = Object.assign(await read(file), value);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
exports.FILE = FILE;
exports.write = write;
exports.read = read;
