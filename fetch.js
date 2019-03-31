const decompress = require('decompress');
const download = require('download');
const fs = require('fs-extra');
const path = require('path');
const {cpExec, pathFilename} = require('./util');



async function dirDehusk(dir) {
  var ents = fs.readdirSync(dir, {withFileTypes: true});
  if(ents.length===0 || ents.length>1 || ents[0].isFile()) return;
  var temp = dir+'.temp', seed = path.join(temp, ents[0].name);
  await fs.move(dir, temp);
  await fs.move(seed, dir);
  await fs.remove(temp);
}

async function fetchGit(url, dir, name=null) {
  var name = name||pathFilename(url);
  var repo = url.replace(/#.*/, ''), branch = url.substring(repo.length+1)||'master';
  var cmd = `git clone --single-branch --branch ${branch} --depth=1 ${repo} ${name}`;
  await cpExec(cmd, {cwd: dir});
}

async function fetchUrl(url, dir, name=null) {
  var name = name||pathFilename(url);
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(url));
  fs.mkdirSync(pkg, {recursive: true});
  await download(url, pkg, {extract: true});
  await fs.remove(out);
  await dirDehusk(pkg);
}

async function fetchFile(file, dir, name=null) {
  var name = name||pathFilename(file.name);
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(file.name));
  fs.mkdirSync(pkg, {recursive: true});
  await new Promise((fres, frej) => file.mv(out, (err) => err? frej(err):fres()));
  await decompress(out);
  await fs.remove(out);
  await dirDehusk(pkg);
}

function fetch(options, dir, name=null) {
  var {git, url, file} = options;
  if(git) return fetchGit(git, dir, name);
  if(url) return fetchUrl(url, dir, name);
  return fetchFile(file, dir, name);
}
module.exports = fetch;
