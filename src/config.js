const fs = require('extra-fs');
const path = require('path');



const FILE = 'config.json';



function exists(dir) {
  var file = path.join(dir, FILE);
  return fs.existsSync(file);
}

async function read(dir) {
  var file = path.join(dir, FILE);
  if(!fs.existsSync(file)) return {};
  var data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function write(dir, value) {
  await fs.mkdirp(dir);
  var file = path.join(dir, file);
  var value = Object.assign(await read(file), value);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
exports.FILE = FILE;
exports.exists = exists;
exports.read = read;
exports.write = write;
