const gulp = require('gulp');

const {forEachFile, baseName, write, execute} = require('./util.js');

// generate a requires file for types|displays
const generateRequiresFile = (name, component) => function generateRequiresFile (cb) {
  let js = name === 'types'
    ? `// This file is created by gulpfile.js using the definitions of engine/core/${name}/*/*.js:custom/*/${name}/*/*.js. \n\n`
    : `// This file is created by gulpfile.js using the definitions of engine/core/${name}/*/*.js:custom/*/${name}/*/*.js. \n\n`;
  forEachFile(`../../engine/core/${name}/*:../../custom/*/${name}/*`,
    file => cb => {
      const id = baseName(file.path);
      const folder = '../../../engine/core'; // TODO could also be custom/something
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
  });
};

function generateCssFile (cb) {
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
  });
}

exports.generateCssFile = generateCssFile;

const audit = execute(`sh ../audit.sh`);
exports.audit = audit;

const pack = execute(`sh ../pack.sh`);
exports.pack = pack;

const generateTypesFile = generateRequiresFile('types', 'actions');
exports.generateTypesFile = generateTypesFile;

const generateDisplaysFile = generateRequiresFile('displays', 'display');
exports.generateDisplaysFile = generateDisplaysFile;

exports.build = gulp.series(generateCssFile, generateTypesFile, generateDisplaysFile, audit, pack);
