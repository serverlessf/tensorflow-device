const cp = require('child_process');

function cpExec(cmd, o) {
  return new Promise((fres, frej) => cp.exec(cmd, o, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
}

async function main() {
  var ans = await downloadGit('/tmp', 'testgit2', 'https://github.com/iiithf/ias-carevaluation');
  console.log(ans);
};
main();
