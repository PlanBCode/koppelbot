const gulp = require('gulp');
const fs = require('fs');
const through = require('through2');
const {exec, spawn} = require('child_process');

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

const padd = x => x < 10 ? '0' + x : x;

function message (string) {
  const now = new Date();
  console.log('[' + padd(now.getHours()) + ':' + padd(now.getMinutes()) + ':' + padd(now.getSeconds()) + '] ' + string);
}

exports.watchGulp = function watchGulp (pattern) {
  message('Redirecting watches...');
  const gulp_watch = gulp.watch;
  const watchers = [];
  gulp.watch = (...args) => { // override gulp.watch to save al watches will be defined, so we can shut them down
    const watcher = gulp_watch(...args);
    watcher.ready = false;
    watcher.on('ready', () => { watcher.ready = true; });
    watchers.push(watcher);
  };
  const launchGulp = () => {
    message('Booting...');

    const child = spawn('gulp', [], {});

    child.stdout.on('data', data => process.stdout.write(data.toString()));

    child.stderr.on('data', error => process.stdout.write(error.toString()));
    // nesting gulp processes
    child.on('close', code => process.exit(code));
  };

  message('Watching gulp...');

  gulp.watch(pattern, function restartGulp (cb) {
    message('Change detected in gulp itself. Shutting watches...');

    for (const watcher of watchers) {
      if (watcher.ready) watcher.close();// console.log
      else watcher.on('ready', () => watcher.close());
    }
    const interval = setInterval(() => {
      if (watchers.filter(w => !w.closed).length === 0) {
        message('All watchers closed.');
        clearInterval(interval);
        launchGulp();
      }
      console.log();
    }, 500);
  });
};
