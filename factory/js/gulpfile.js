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
    const subPatterns = pattern.split(':'); // "/a/b/c:/d/e/f"->
    let count = 0;
    const mergeCb = () => {
        ++count;
        if (count === subPatterns.length) cb();
    }
    for (let subPattern of subPatterns) {
        gulp.src(subPattern)
            .pipe(through.obj(function (file, enc, cb1) {
                // file.path, file.contents
                action(file)(cb1);
            })).on('finish', function () {
            mergeCb();
        });
    }
};

const write = (path, content) => cb => {
    fs.writeFile(path, content, handleError(cb));
};

// generate a requires file for types|displays
const generateRequiresFile = (name, component) => cb => {
    let js = name === 'types'
        ? `// This file is created by gulpfile.js using the definitions of engine/core/${name}/*/*.js:custom/*/${name}/*/*.js. \n\n`
        : `// This file is created by gulpfile.js using the definitions of engine/core/${name}/*/*.js:custom/*/${name}/*/*.js. \n\n`;
    forEachFile(`../../engine/core/${name}/*:../../custom/*/${name}/*`,
        file => cb => {
            const id = baseName(file.path);
            const folder = '../../../engine/core'; //TODO could also be custom/something
            if (name === 'types') {
                js += `exports.${baseName(file.path)} = require('${folder}/${name}/${id}/${id}.js').${component};\n`;
                js += `exports.${baseName(file.path)}.json = require('${folder}/${name}/${id}/${id}.json');\n\n`;
            } else {
                js += `exports.${baseName(file.path)} = require('${folder}/${name}/${id}/${id}.js').${component};\n`;
            }
            cb();
        }
    )(() => {
        write(`./build/${name}.js`, js)(cb);
    })
};

const generateCssFile = cb => {
    let css = `/* This file is created by gulpfile.js using the css definitions of engine/core and factory/css */\n\n`;
    forEachFile([
            '../../engine/core/*/*/*.css',
            '../../custom/*/types/*/*.css',
            '../../custom/*/displays/*/*.css',
            '../css/*.css'
        ].join(':'),
        file => cb => {
            css += file.contents;
            cb();
        }
    )(() => {
        write(`../../engine/ui/style.css`, css)(cb);
    })
};

const build = execute(`sh ../audit.sh; sh ../build.sh`);

const generateTypesFile = generateRequiresFile('types', 'actions');
const generateDisplaysFile = generateRequiresFile('displays', 'display');

gulp.watch([`../../engine/core/*/*/*.css`], gulp.series(generateCssFile, build));
gulp.watch([`../../custom/*/types/*/*.css`], gulp.series(generateCssFile, build));
gulp.watch([`../../custom/*/displays/*/*.css`], gulp.series(generateCssFile, build));

gulp.watch([`../../engine/core/types/**/*.js`], gulp.series(generateTypesFile, build));
gulp.watch([`../../custom/*/types/**/*.js`], gulp.series(generateTypesFile, build));

gulp.watch([`../../engine/core/displays/**/*.js`], gulp.series(generateDisplaysFile, build));
gulp.watch([`../../custom/*/displays/**/*.js`], gulp.series(generateDisplaysFile, build));

gulp.watch([`./source/**/*.js`], build);

exports.default = gulp.series(generateCssFile, generateTypesFile, generateDisplaysFile, build);
