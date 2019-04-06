const net = require('extra-net');
const path = require('path');
const fs = require('fs-extra');



const E = process.env;
const ROOT = path.dirname(require.main.filename);
const SROOT = path.join(ROOT, '_data', 'service');
const PROOT = path.join(ROOT, '_data', 'process');
const PORT = E['PORT']||'8000';
const IP = net.address().address;
const ADDRESS = IP+':'+PORT;
const QUERY = E['QUERY']||'';

const CONFIGFILE = 'config.json';
const ARRAYKEYS = ['ports', 'mounts', 'env', 'cmd'];
const DEFAULTPATH = path.join(ROOT, 'config');
const DEFAULTENGINE = 'python:3';
const DEFAULTS = new Map();



function defaultEnv(o, portMap=null) {
  var env = o.env = o.env||{};
  o.address = portMap? portMap.map(p => `${IP}:${p}`).join():'';
  env['PORT'] = o.ports.join();
  env['ADDRESS'] = o.address;
  env['DEVICE'] = DEVICE;
  env['QUERY'] = QUERY;
  env['SERVICE'] = o.name;
  env['PROCESS'] = '';
  return o;
}

function defaults(o) {
  ARRAYKEYS.forEach(k => { if(typeof o[k]==='string') o[k] = o[k].split(';'); });
  o = Object.assign(DEFAULTS.get((o.engine||DEFAULTENGINE).replace(/\W/g, '_').replace(/:.*/, '')), o);
  o = Object.assign(DEFAULTS.get('index'), o);
  o.created = o.created||new Date();
  return defaultEnv(o);
}

function dockerfile(o, out = '') {
  out += `FROM ${o.engine}\n`;
  out += `WORKDIR ${o.workdir}\n`;
  out += `COPY . ${o.workdir}\n`;
  if(o.run) o.run.forEach(r => out += `RUN ${r}\n`);
  if(o.ports) o.ports.forEach(p => out += `EXPOSE ${p}\n`);
  if(o.env) Object.keys(o.env).forEach(k => out += `ENV ${k} "${o.env[k]}"\n`);
  if(o.cmd) out += 'CMD ['+o.cmd.map(p => `"${p}"`).join(', ')+']\n';
  return out;
}

async function write(dir, value) {
  value = defaults(value);
  var file = path.join(dir, CONFIGFILE);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
  return value;
}

async function read(dir, value) {
  var file = path.join(dir, CONFIGFILE);
  var o = fs.existsSync(file)? JSON.parse(await fs.readFile(file, 'utf8')):{};
  return defaults(Object.assign(o, value));
}

async function prepare(dir, value) {
  value = await write(dir, value);
  var dock = path.join(dir, 'Dockerfile');
  if(!fs.existsSync(dock)) await fs.writeFile(dock, dockerfile(value));
  return value;
}

async function run(o, name) {
  var portMap = await Promise.all(o.ports.map(p => net.freePort()));
  defaultEnv(o, portMap);
  var workdir = `-w ${o.workdir}`, name = `--name ${name}`;
  var ports = o.ports? o.ports.reduce((str, port, i) => str+` -p ${portMap[i]}:${port}`, ''):'';
  var mounts = o.mounts? o.mounts.reduce((str, mount) => str+` --mount ${mount}`, ''):'';
  var env = o.env? Object.keys(o.env).reduce((str, k) => str+` -e ${k}=${o.env[k]}`, ''):'';
  var image = o.engine, cmd = o.cmd? o.cmd.map(c => /\s/.test(c)? `"${c}"`:c).join(' '):'';
  return `docker run -d ${workdir} ${name} ${ports} ${mounts} ${env} -it ${image} ${cmd}`;
}
exports.ROOT = ROOT;
exports.SROOT = SROOT;
exports.PROOT = PROOT;
exports.PORT = PORT;
exports.IP = IP;
exports.ADDRESS = ADDRESS;
exports.QUERY = QUERY;
exports.defaults = defaults;
exports.write = write;
exports.read = read;
exports.prepare = prepare;
exports.run = run;



for(var file of fs.readdirSync(DEFAULTPATH)) {
  var config = JSON.parse(fs.readFileSync(path.join(DEFAULTPATH, file), 'utf8'));
  DEFAULTS.set(path.parse(file).name, config);
}
