const fs = require('extra-fs');
const net = require('extra-net');



const E = process.env;
const IP = net.address().address;
const PORT = parseInt(E['PORT']||'8000', 10);
const DEVICE = `${IP}:${PORT}`;
const MASTER = E['MASTER']||'';
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



async function write(cfg, options) {
  var o = fs.existsSync(cfg)? JSON.parse(await fs.readFile(cfg, 'utf8')):{};
  await fs.writeFile(cfg, JSON.stringify(Object.assign(o, options), null, 2));
  return o;
}

async function read(cfg, options) {
  var o = fs.existsSync(cfg)? JSON.parse(await fs.readFile(cfg, 'utf8')):{};
  return Object.assign(o, options);
}

function defaults(options) {
  var o = Object.assign({}, COMMON, options);
  var from = o.from.replace(/\W.*/, '');
  o = Object.assign(o, SPECIFIC[from], o);
  o.ctime = o.atime = o.mtime = new Date();
  return o;
}
exports.IP = IP;
exports.PORT = PORT;
exports.DEVICE = DEVICE;
exports.MASTER = MASTER;
exports.write = write;
exports.read = read;
exports.defaults = defaults;
