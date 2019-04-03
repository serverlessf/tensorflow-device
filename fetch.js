const decompress = require('decompress');
const download = require('download');
const cp = require('extra-cp');
const fs = require('fs-extra');
const path = require('path');



async function dirDehusk(dir) {
  var ents = fs.readdirSync(dir, {withFileTypes: true});
  if(ents.length===0 || ents.length>1 || ents[0].isFile()) return;
  var temp = dir+'.temp', seed = path.join(temp, ents[0].name);
  await fs.move(dir, temp);
  await fs.move(seed, dir);
  await fs.remove(temp);
}

async function fetchGit(url, dir, name=null) {
  var name = name||path.parse(url).file;
  var pkg = path.join(dir, name);
  if(fs.existsSync(pkg)) await fs.remove(pkg+'/*');
  var repo = url.replace(/#.*/, ''), branch = url.substring(repo.length+1)||'master';
  var cmd = `git clone --single-branch --branch ${branch} --depth=1 ${repo} ${name}`;
  await cp.exec(cmd, {cwd: dir});
}

async function fetchUrl(url, dir, name=null) {
  var name = name||path.parse(url).file;
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(url));
  if(fs.existsSync(pkg)) await fs.remove(pkg+'/*');
  fs.mkdirSync(pkg, {recursive: true});
  await download(url, pkg, {extract: true});
  await fs.remove(out);
  await dirDehusk(pkg);
}

async function fetchFile(file, dir, name=null) {
  var name = name||path.parse(file.name).name;
  var pkg = path.join(dir, name);
  var out = path.join(pkg, path.basename(file.name));
  if(fs.existsSync(pkg)) await fs.remove(pkg+'/*');
  fs.mkdirSync(pkg, {recursive: true});
  await new Promise((fres, frej) => file.mv(out, (err) => err? frej(err):fres()));
  await decompress(out, pkg);
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
