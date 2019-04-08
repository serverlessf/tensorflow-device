const Docker = require('dockerode');
const cp = require('extra-cp');
const image = require('./image');



const NOOPTIONS = ['changes', 'export', 'start'];
const docker = new Docker();



function lsOptions(options) {
  var o = options||{}, f = {};
  for(var k in o)
    f[k] = Array.isArray(o[k])? o[k]:[o[k]];
  if(f.image) f.ancestor = f.image;
  return {all: true, filters: f};
}

function lsMap(options) {
  var o = options;
  return {
    id: o.Names[0].substring(1), image: o.Image,
    ctime: new Date(o.Created), atime: 0, mtime: 0,
    status: o.State, message: o.Status,
  };
};

function inspectMap(options) {
  var o = options, s = o.State, hc = o.HostConfig, c = o.Config;
  return {
    id: o.Name.substring(1), ctime: new Date(o.Created),
    status: s.Status, exitcode: s.ExitCode, error: s.Error,
    stime: new Date(s.StartedAt), ftime: new Date(s.FinishedAt),
    restart: hc.RestartPolicy.Name, image: c.Image, workdir: c.WorkingDir,
  };
}

function dockerExec(container, options) {
  var o = options, e = '';
  e += `docker container exec -dit`;
  for(var k in o.env||{})
    e += ` -e ${k}=${o.env[k]}`;
  if(o.privileged) e += ` --privileged`;
  if(o.workdir) e += ` -w ${o.workdir}`;
  e += ` ${container}`;
  for(var c of o.cmd||[])
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
  docker.getContainer(id)[action](options);
}
exports.ls = ls;
exports.config = getConfig;
exports.exec = exec;
exports.command = command;
