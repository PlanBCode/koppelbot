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

const generateRequiresFile = (name, component) => cb => {
    let js = name === 'types'
        ? `// This file is created by gulpfile.js using the type definitions of engine/core/${name}/*/*.js. \n\n`
        : `// This file is created by gulpfile.js using the type definitions of engine/core/${name}/*.js. \n\n`;
    forEachFile(`../../engine/core/${name}/*`,
        file => cb => {
            const id = baseName(file.path);
            if (name === 'types') {
                js += `exports.${baseName(file.path)} = require('../../../engine/core/${name}/${id}/${id}.js').${component};\n`;
                js += `exports.${baseName(file.path)}.json = require('../../../engine/core/${name}/${id}/${id}.json');\n\n`;
            } else {
                js += `exports.${baseName(file.path)} = require('../../../engine/core/${name}/${id}.js').${component};\n`;
            }
            cb();
        }
    )(() => {
        write(`./build/${name}.js`, js)(cb);
    })
};

const build = execute(`sh ../audit.sh; sh ../build.sh`);

const generateTypesFile = generateRequiresFile('types', 'actions');
const generateDisplaysFile = generateRequiresFile('displays', 'display');

gulp.watch([`../../engine/core/types/**/*.js`], gulp.series(generateTypesFile, build));
gulp.watch([`../../engine/core/displays/**/*.js`], gulp.series(generateDisplaysFile, build));
gulp.watch([`./source/**/*.js`], build);

exports.default = gulp.series(generateTypesFile, generateDisplaysFile, build);
