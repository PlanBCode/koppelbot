const gulp = require('gulp');
const fs = require('fs');
const through = require('through2');
const exec = require('child_process').exec;

exports.baseName = function baseName (str) {
  let base = str.substring(str.lastIndexOf('/') + 1);
  if (base.lastIndexOf('.') !== -1) { base = base.substring(0, base.lastIndexOf('.')); }
  return base;
};

const handleError = cb => (error, stdout, stderr) => {
  if (error !== null) console.error(`Error: ${error}\n ${stderr}`);
  cb();
};

const execute = command => function execute (cb) {
  exec(command, handleError(cb));
};
exports.execute = execute;

exports.mkDir = function mkDir (path) { execute(`mkdir -p ${path};`); };

// action = file => cb => {}
exports.forEachFile = (pattern, action) => function forEachFile (cb) {
  const subPatterns = pattern.split(':'); // "/a/b/c:/d/e/f"->
  let count = 0;
  const mergeCb = () => {
    ++count;
    if (count === subPatterns.length) cb();
  };
  for (const subPattern of subPatterns) {
    gulp.src(subPattern)
      .pipe(through.obj(function (file, enc, cb1) {
        // file.path, file.contents
        action(file)(cb1);
      })).on('finish', function () {
        mergeCb();
      });
  }
};

exports.write = (path, content) => function write (cb) {
  fs.writeFile(path, content, handleError(cb));
};

exports.read = path => function read (cb) {
  fs.readFile(path, (error, stdout, stderr) => {
    if (error !== null) console.error(`Error: ${error}\n ${stderr}`);
    cb(stdout.toString());
  });
};
