const fs = require('extra-fs');
const path = require('path');



async function read(file) {
  if(!fs.existsSync(file)) return {};
  var data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function write(file, value) {
  await fs.mkdirp(path.dirname(file));
  var value = Object.assign(await read(file), value);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
exports.read = read;
exports.write = write;
