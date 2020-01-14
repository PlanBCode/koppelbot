const gulp = require('gulp');
const fs = require('fs');
const through = require('through2');
const exec = require('child_process').exec;

function baseName(str) {
    let base = str.substring(str.lastIndexOf('/') + 1);
    if (base.lastIndexOf(".") !== -1)
        base = base.substring(0, base.lastIndexOf("."));
    return base;
}

const handleError = cb => (error, stdout, stderr) => {
    if (error !== null) {
        console.error(`Error: ${error}\n ${stderr}`);
    }
    cb();
};

const execute = command => cb => {
    exec(command, handleError(cb));
};

const mkDir = path => execute(`mkdir -p ${path};`);

// action = file => cb => {}
const forEachFile = (pattern, action) => (cb) => {
    gulp.src(pattern)
        .pipe(through.obj(function (file, enc, cb1) {
            // file.path
            // file.content
            action(file)(cb1);
        })).on('finish', function () {
        cb();
    });
};

const write = (path, content) => cb => {
    fs.writeFile(path, content, handleError(cb));
};

function addTypes(cb) {
    let js = '// This file is created by gulpfile.js using the type definitions of lib/types/*.js. \n\n';
    forEachFile('../../types/*.js',
        file => cb => {
            js += `exports.${baseName(file.path)} = require('../../../types/${baseName(file.path)}.js').actions;\n`;
            cb();
        }
    )(() => {
        write('./build/types.js', js)(cb);
    })
}

const webPack = execute(`node_modules/webpack/bin/webpack.js --config "conf/webpack.conf.js" --mode development`);

const series = gulp.series(addTypes, webPack);

gulp.watch([`../../types/*.js`], series);
gulp.watch([`./source/**/*.js`], webPack);
exports.default = series;
