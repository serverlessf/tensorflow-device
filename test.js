const cp = require('child_process');
const path = require('path');

function cpExec(cmd, o) {
  return new Promise((fres, frej) => cp.exec(cmd, o, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
}

function pathFilename(p) {
  var base = path.basename(p).length, ext = path.extname(p).length;
  return p.substring(p.length-base, p.length-ext);
}

async function downloadGit(url, dir, name=null) {
  var name = name||pathFilename(url);
  var repo = url.replace(/#.*/, ''), branch = url.substring(repo.length+1)||'master';
  var cmd = `git clone --single-branch --branch ${branch} --depth=1 ${repo} ${name}`;
  await cpExec(cmd, {cwd: dir});
}

async function main() {
  var ans = downloadGit('https://github.com/iiithf/ias-carevaluation', '/tmp');
  console.log(ans);
};
main();
