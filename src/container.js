const Docker = require('dockerode');
const cp = require('extra-cp');
const fs = require('extra-fs');
const path = require('path');
const image = require('./image');
const config = require('./config')



const NOOPTIONS = ['changes', 'export', 'start'];
const ROOT = path.join(process.cwd(), '_data', 'container');
const CONFIGFILE = 'config.json';
const docker = new Docker();



function lsOptions(options) {
  var o = options||{}, f = {}, all = true;
  for(var k in o) {
    if(k==='all') all = o[k];
    else f[k] = Array.isArray(o[k])? o[k]:[o[k]];
  }
  if(f.image) f.ancestor = f.image;
  return {all, filters: f};
}

function lsMapPublish(ports) {
  var ps = ports||[], publish = {};
  for(var p of ps)
    publish[p.PublicPort] = `${p.PrivatePort}/${p.Type}`;
  return publish;
}

function lsMap(options) {
  var o = options;
  return {
    id: o.Names[0].substring(1), image: o.Image,
    ctime: new Date(o.Created), atime: 0, mtime: 0,
    status: o.State, message: o.Status,
    publish: lsMapPublish(o.Ports), env: o.Env,
  };
};

function inspectMapPublish(portBindings) {
  var pbs = portBindings||{}, publish = {};
  for(var k in pbs)
    publish[pbs[k][0].HostPort] = k;
  return publish;
}

function inspectMapMounts(mounts) {
  var out = [];
  for(var m of mounts||[])
    out.push({type: m.Type, source: m.Source, target: m.Destination});
  return out;
}

function inspectMapEnv(env) {
  var out = {};
  for(var e of env) {
    var p = e.split('=');
    out[p[0]] = p[1]||'';
  }
  return out;
}

function inspectMap(options) {
  var o = options, s = o.State, hc = o.HostConfig, c = o.Config;
  return {
    id: o.Name.substring(1), ctime: new Date(o.Created),
    status: s.Status, exitcode: s.ExitCode, error: s.Error,
    stime: new Date(s.StartedAt), ftime: new Date(s.FinishedAt),
    restart: hc.RestartPolicy.Name, image: c.Image, workdir: c.WorkingDir,
    publish: inspectMapPublish(hc.PortBindings),
    mounts: inspectMapMounts(o.Mounts), env: inspectMapEnv(c.Env),
  };
}

function inspect(id) {
  return docker.getContainer(id).inspect().then(inspectMap);
}

function dockerExec(container, options) {
  var o = options, e = '';
  e += `docker container exec -t`;
  for(var k in o.env||{})
    e += ` -e ${k}=${o.env[k]}`;
  if(o.privileged) e += ` --privileged`;
  if(o.workdir) e += ` -w ${o.workdir}`;
  e += ` ${container}`;
  if(typeof o.cmd==='string') e += ` ${o.cmd}`;
  else for(var c of o.cmd||[])
    e += ` "${c}"`;
  return e;
}



async function ls(options) {
  var imap = new Map();
  var cs = await docker.listContainers(lsOptions(options));
  cs.forEach(c => imap.set(c.Image, null));
  imgs = await Promise.all(Array.from(imap.keys()).map(id => image.status(id)));
  imgs.forEach(i => imap.set(i.id, i));
  return cs.map(c => Object.assign({}, imap.get(c.Image), lsMap(c)));
}

async function remove(id, options) {
  try { await docker.getContainer(id).stop(options); } catch (e) {}
  return await docker.getContainer(id).remove(options);
}

// we can update restart policy of already running containers
async function status(id, prev={}, state=inspect(id)) {
  var file = path.join(ROOT, id, CONFIGFILE);
  return Promise.all([prev, config.read(file), state]).then(vs => Object.assign.apply(null, vs));
}

function setStatus(id, value) {
  var file = path.join(ROOT, id, CONFIGFILE);
  return config.write(file, value);
}

function exec(id, options) {
  return cp.exec(dockerExec(id, options));
}

// changes, export, logs, getArchive
function command(id, action, options) {
  options = NOOPTIONS.includes(action)? undefined:options;
  return docker.getContainer(id)[action](options);
}
exports.ls = ls;
exports.remove = remove;
exports.status = status;
exports.setStatus = setStatus;
exports.exec = exec;
exports.command = command;
fs.mkdirpSync(ROOT);
