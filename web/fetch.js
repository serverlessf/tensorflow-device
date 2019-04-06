const decompress = require('decompress');
const download = require('download');
const cp = require('extra-cp');
const fs = require('extra-fs');
const path = require('path');



async function fetchGit(dir, url) {
  var repo = url.replace(/#.*/, ''), branch = url.substring(repo.length+1)||'master';
  var cmd = `git clone --single-branch --branch ${branch} --depth=1 ${repo} .`;
  await cp.exec(cmd, {cwd: dir});
}

async function fetchUrl(dir, url) {
  var out = path.join(dir, path.basename(url));
  await download(url, dir, {extract: true});
  await fs.remove(out);
  await fs.dehuskDir(dir);
}

async function fetchFile(dir, file) {
  var out = path.join(dir, path.basename(file.name));
  await new Promise((fres, frej) => file.mv(out, e => e? frej(e):fres()));
  await decompress(out, dir);
  await fs.remove(out);
  await fs.dehuskDir(dir);
}

async function fetch(dir, options) {
  var {git, url, file} = options;
  if(fs.existsSync(dir)) await fs.remove(dir+'/*');
  else await fs.mkdirp(dir);
  if(git) return fetchGit(dir, git);
  if(url) return fetchUrl(dir, url);
  return fetchFile(dir, file);
}
module.exports = fetch;
