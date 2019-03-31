const cp = require('child_process');

function cpExec(cmd, o) {
  return new Promise((fres, frej) => cp.exec(cmd, o, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
}

async function main() {
  var ans = await cpExec('ls');
  console.log(ans);
};
main();
