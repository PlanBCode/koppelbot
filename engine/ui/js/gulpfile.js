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
    let js = `// This file is created by gulpfile.js using the type definitions of engine/core/${name}/*.js. \n\n`;
    forEachFile(`../../core/${name}/*`,
        file => cb => {
        const id = baseName(file.path);
            if(name === 'types') {
                js += `exports.${baseName(file.path)} = require('../../../core/${name}/${id}/${id}.js').${component};\n`;
                js += `exports.${baseName(file.path)}.json = require('../../../core/${name}/${id}/${id}.json');\n\n`;
            }else{
                js += `exports.${baseName(file.path)} = require('../../../core/${name}/${id}.js').${component};\n`;

            }
            cb();
        }
    )(() => {
        write(`./build/${name}.js`, js)(cb);
    })
};

const webPack = execute(`node_modules/webpack/bin/webpack.js --config "conf/webpack.conf.js" --mode development`);

const generateTypesFile = generateRequiresFile('types','actions');
const generateDisplaysFile = generateRequiresFile('displays','display');

gulp.watch([`../../core/types/*/*.js`], gulp.series(generateTypesFile,webPack));
gulp.watch([`../../core/displays/*.js`], gulp.series(generateDisplaysFile,webPack));
gulp.watch([`./source/**/*.js`], webPack);

exports.default = gulp.series( generateTypesFile, generateDisplaysFile , webPack);
