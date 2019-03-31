const cp = require('child_process');
const path = require('path');



function arrayEnsure(v) {
  if(v==null) return [];
  return Array.isArray(v)? v:[v];
}

function cpExec(cmd, o) {
  return new Promise((fres, frej) => cp.exec(cmd, o, (err, stdout, stderr) => {
    return (err? frej:fres)({err, stdout, stderr});
  }));
}

function pathFilename(p) {
  var base = path.basename(p).length, ext = path.extname(p).length;
  return p.substring(p.length-base, p.length-ext);
}



exports.arrayEnsure = arrayEnsure;
exports.cpExec = cpExec;
exports.pathFilename = pathFilename;
