const decompress = require('decompress');
const download = require('download');
const cp = require('extra-cp');
const fs = require('fs-extra');
const path = require('path');



async function dirDehusk(dir) {
  var ents = await fs.readdir(dir, {withFileTypes: true});
  if(ents.length===0 || ents.length>1 || ents[0].isFile()) return;
  var temp = dir+'.temp', seed = path.join(temp, ents[0].name);
  await fs.move(dir, temp);
  await fs.move(seed, dir);
  await fs.remove(temp);
}

async function fetchGit(dir, url) {
  var repo = url.replace(/#.*/, ''), branch = url.substring(repo.length+1)||'master';
  var cmd = `git clone --single-branch --branch ${branch} --depth=1 ${repo} .`;
  await cp.exec(cmd, {cwd: dir});
}

async function fetchUrl(dir, url) {
  var out = path.join(dir, path.basename(url));
  await fs.mkdir(dir);
  await download(url, dir, {extract: true});
  await fs.remove(out);
  await dirDehusk(dir);
}

async function fetchFile(dir, file) {
  var out = path.join(dir, path.basename(file.name));
  await fs.mkdir(dir);
  await new Promise((fres, frej) => file.mv(out, e => e? frej(e):fres()));
  await decompress(out, dir);
  await fs.remove(out);
  await dirDehusk(dir);
}

function fetch(dir, options) {
  var {git, url, file} = options;
  if(git) return fetchGit(dir, git);
  if(url) return fetchUrl(dir, url);
  return fetchFile(dir, file);
}
module.exports = fetch;
