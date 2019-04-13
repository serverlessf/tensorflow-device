const Docker = require('dockerode');
const cp = require('extra-cp');
const image = require('./image');



const NOOPTIONS = ['changes', 'export', 'start'];
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
    publish: lsMapPublish(o.Ports),
  };
};

function inspectMapPublish(portBindings) {
  var pbs = portBindings||{}, publish = {};
  for(var k in pbs)
    publish[pbs[k][0].HostPort] = k;
  return publish;
}

function inspectMapMounts(mounts) {
  var ms = mounts||[], out = [];
  for(var m of mounts)
    out.push({type: m.Type, source: m.Source, target: m.Destination});
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
    mounts: inspectMapMounts(o.Mounts),
  };
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
  imgs = await Promise.all(Array.from(imap.keys()).map(id => image.config(id)));
  imgs.forEach(i => imap.set(i.id, i));
  return cs.map(c => Object.assign({}, imap.get(c.Image), lsMap(c)));
}

async function remove(id, options) {
  try { await docker.getContainer(id).stop(options); } catch (e) {}
  return await docker.getContainer(id).remove(options);
}

// we can update restart policy of already running containers
async function getConfig(id, options) {
  var c = await docker.getContainer(id).inspect(options);
  var i = await image.config(c.Config.Image);
  return Object.assign(i, inspectMap(c));
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
exports.config = getConfig;
exports.exec = exec;
exports.command = command;
