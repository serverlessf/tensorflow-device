const cp = require('child_process');



function arrayEnsure(v) {
  if(v==null) return [];
  return Array.isArray(v)? v:[v];
}

function cpExec(cmd, o) {
  return new Promise((fres, frej) => cp.exec(cmd, o, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
}



exports.arrayEnsure = arrayEnsure;
exports.cpExec = cpExec;
