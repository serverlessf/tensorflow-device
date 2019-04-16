const fs = require('extra-fs');
const net = require('extra-net');
const path = require('path');



const E = process.env;
const IP = net.address().address;
const PORT = parseInt(E['PORT']||'8000', 10);
const DEVICE = `${IP}:${PORT}`;
const MASTER = E['MASTER']||'';
const DIRNAME = path.dirname(require.main.filename);
const COMMON = {
  version: 0,
  expose: [8000],
  from: 'python:3.7-slim',
  workdir: '/app',
};
const SPECIFIC = {
  node: {
    run: ['npm install'],
    cmd: ['npm', 'start'],
  },
  python: {
    run: [
      'if test -e requirements.txt; then pip install -r requirements.txt; fi',
      'if test -e setup.py; then python setup.py; fi'
    ],
    cmd: ['python', 'main.py'],
  },
  tensorflow: {
    workdir: '/models/model',
    expose: [8500, 8501],
    env: {'MODEL_NAME': 'model'},
  },
};



function defaults(value) {
  var o = Object.assign({}, COMMON, value);
  var from = o.from.replace(/\W.*/, '');
  o = Object.assign(o, SPECIFIC[from], o);
  o.ctime = o.atime = o.mtime = new Date();
  return o;
}

async function read(file) {
  return fs.existsSync(file)? JSON.parse(await fs.readFile(file, 'utf8')):{};
}

async function write(file, value) {
  await fs.mkdirp(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(Object.assign(await read(file), value), null, 2));
}
exports.IP = IP;
exports.PORT = PORT;
exports.DEVICE = DEVICE;
exports.MASTER = MASTER;
exports.DIRNAME = DIRNAME;
exports.write = write;
exports.read = read;
exports.defaults = defaults;
