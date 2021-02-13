const gulp = require('gulp');

const {forEachFile, baseName, read, write, execute} = require('./util.js');

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
      } else if (id !== 'create') {
        js += `exports.${baseName(file.path)} = require('${folder}/${name}/${id}/${id}.js').${component};\n`;
      }
      cb();
    }
  )(() => {
    write(`./build/${name}.js`, js)(cb);
  });
};

function generateCssFile (cb) {
  let css = '/* This file is created by gulpfile.js using the css definitions of engine/core and factory/css */\n\n';
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
    write('../../engine/ui/style.css', css)(cb);
  });
}

const parseType = string => {
  if (!string.includes('{')) return string;
  if (!string.includes('}')) return string;

  return string.split('{')[1].split('}')[0] // get {type}
    .replace(/String/g, 'string')
    .replace(/Bool/g, 'bool')
    .replace(/boolean/g, 'bool')
    .replace(/Number/g, 'number')
    .replace(/array/g, 'Array')
    .replace(/mixed/g, 'Mixed')
    .replace(/function/g, 'Function')
    .replace(/object/g, 'Object');
};

const parseTypeAndDef = string => {
  if (!string.includes('{')) return string;
  if (!string.includes('}')) return string;
  return '<span style="margin-left:20px;margin-right:20px;color:green;">' + parseType(string) + '</span> ' + string.split('}')[1];
};

const generateJsDoc = (path, title) => cb => {
  read(path)(string => {
    const regex = /(\*\*\s*\n([^*]|\*[^/])*\*\/)\s*this\.(?<function>\w+)/g;
    let x;
    let html = `<!-- This file is created by gulpfile.js using the jsdoc definitions of factory/${path} -->
<h1>${title}</h1>
<style>

.xyz-doc-method{
  margin-bottom: 2cm;
}

.xyz-doc-returns, .xyz-doc-parameters {
  border-style: solid;
  border-width: 1px;
  border-radius: 5px;
  border-color: lightgray;
  padding: 10px;
  margin: 10px;
  border-left-width: 5px;

}

h4 {
  margin-top: 0;
}
.xyz-doc-returns{
  border-left-color: green;
}
.xyz-doc-returns h4 {
  color:green
}
.xyz-doc-parameters{
  border-left-color: blue;
}

.xyz-doc-parameters h4{
  color:blue
}

.xyz-doc-parameters table {
  width: 100%;
  border-collapse: collapse;
}

.xyz-doc-parameters td{
  padding:10px;
}
.xyz-doc-parameters tr{
  background-color:EEE;
}
.xyz-doc-parameters tr:first-child{
  background-color:FFF;
  border-bottom-style: solid;
  border-bottom-width: 1px;
}
.xyz-doc-signature{
  color:blue;
  font-weight:normal;
  font-style: inherit;
}
.xyz-doc-returnSignature{
  color:green;
  font-weight:normal;
  font-style: inherit;
}
</style>`;
    const methods = [];
    while ((x = regex.exec(string))) {
      methods.push(x);
    }
    methods.sort((a, b) => a.groups.function.localeCompare(b.groups.function));
    for (const x of methods) {
      const name = x.groups.function;
      const lines = x[1]
        .split('\n')
        .filter(line => line.startsWith('   * '))
        .map(line => line.substr(5).replace(/ {2}/g, ' '));
      let description = '';
      const examples = [];
      let returns = '{void}';
      const params = {};
      for (const line of lines) {
        if (line.startsWith('@param')) {
          const [type, name, ...description] = line.substr(7).split(' ');
          params[name] = {type, description: description.join(' ')};
          // @param {string} target
        } else if (line.startsWith('@returns')) returns = line.substr(9);
        else if (line.startsWith('@example')) examples.push(line.substr(9));
        else if (examples.length > 0) examples[examples.length - 1] += line;
        else description += line;
      }
      const hasReturn = returns && !returns.toLowerCase().includes('{void}');

      html += `  <div class="xyz-doc-method"><h3>${name}(<span class="xyz-doc-signature">${Object.keys(params).join(',')}</span>)`;
      if (hasReturn) {
        html += ` &rarr; <span class="xyz-doc-returnSignature">${parseType(returns)}</span>`;
      }
      html += '</h3>\n';
      // html+= `<tr><td class="xyz-doc-description" colspan="3">${description}</td></tr>\n`;
      if (Object.keys(params).length > 0) {
        html += `<div class="xyz-doc-parameters"> <h4>Parameters</h4>
    <table>\n`;
        html += '  <tr><td>Name</td><td>Type</td><td>Description</td></tr>\n';
        for (const id in params) {
          html += `  <tr><td style="color:blue;">${id}</td><td>${parseType(params[id].type)}</td><td>${params[id].description}</td></tr>\n`
          ;
        }
        html += '    </table></div>\n';
      }
      if (hasReturn) {
        html += `<div class="xyz-doc-returns"><h4>Returns</h4> ${parseTypeAndDef(returns)}</div>\n`;
      }
      html += '</div>';
    }
    write(`../../engine/doc/dev/classes/${title.toLowerCase()}.html`, html)(cb);
  });
};

exports.generateCssFile = generateCssFile;

const audit = execute('sh ../audit.sh');
exports.audit = audit;

const pack = execute('sh ../pack.sh');
exports.pack = pack;

const generateTypesFile = generateRequiresFile('types', 'actions');
exports.generateTypesFile = generateTypesFile;

const generateDisplaysFile = generateRequiresFile('displays', 'display');
exports.generateDisplaysFile = generateDisplaysFile;
const generateJsDocs = gulp.series(generateJsDoc('./source/render/display.js', 'Display'), generateJsDoc('./source/render/item.js', 'Item'));
exports.build = gulp.series(generateCssFile, generateTypesFile, generateDisplaysFile, audit, pack, generateJsDocs);
exports.generateJsDocs = generateJsDocs;
