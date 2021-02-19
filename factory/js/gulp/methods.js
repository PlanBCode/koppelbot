const gulp = require('gulp');
const fs = require('fs');

const {forEachFile, baseName, read, write, execute, watchGulp} = require('./util.js');

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
  string = string.trim().split(' ')[0];

  if (string.includes('{') && string.includes('}')) {
    string = string.split('{')[1].split('}')[0]; // get {type}
  }
  string = string.replace(/;/g, '');
  return string
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
  const type = parseType(string);
  const description = string.trim().split(' ').slice(1).join(' ') || '';
  return '<span style="margin-left:20px;margin-right:20px;color:green;">' + type + '</span> ' + description;
};

// this.$function = ...
// $function2: ...
const jsRegex = /(\*\*\s*\n([^*]|\*[^/])*\*\/)\s*((this|exports)\.(?<function>\w+)|(?<function2>\w+):)/g;
// abstract public function $function(...):$returns
const phpRegex = /(\*\*\s*\n([^*]|\*[^/])*\*\/)\s*(?<function>[^\n]+)/g;

const generateDoc = (path, title, docPath) => function generateDoc (cb) {
  const isPhp = path.endsWith('.php');
  const regex = isPhp ? phpRegex : jsRegex;
  const css = fs.readFileSync('../../engine/doc/dev/dev.css').toString();
  read(path)(string => {
    let x;
    let html = `<!-- This file is created by gulpfile.js using the jsdoc definitions of factory/${path} -->
<h1>${title}</h1>
<style>${css}</style>`;
    const methods = [];
    while ((x = regex.exec(string))) {
      methods.push(x);
    }
    methods.sort((a, b) => (a.groups.function || a.groups.function2).localeCompare(b.groups.function || b.groups.function2));
    for (const x of methods) {
      let name = x.groups.function || x.groups.function2;
      let abstract = false;
      let returns = '{void}';

      if (isPhp) {
        if (name.includes(':')) returns = '{' + name.split(':')[1].trim() + '}';
        const words = name.split('(')[0].split(' ');
        abstract = name.includes('abstract ');
        name = words[words.length - 1];
      }

      const lines = x[1]
        .split('\n')
        .filter(line => line.trim().startsWith('* '))
        .map(line => line.trim().substr(2).replace(/  +/g, ' '));
      let description = '';
      const examples = [];
      const params = {};
      for (const line of lines) {
        if (line.startsWith('@param')) {
          const [type, name, ...description] = line.substr(7).split(' ');
          params[name] = {type, description: description.join(' ')};
          // @param {string} target
        } else if (line.startsWith('@returns')) returns = line.substr(9);
        else if (line.startsWith('@abstract')) abstract = true;
        else if (line.startsWith('@return')) returns = line.substr(8);
        else if (line.startsWith('@example')) examples.push(line.substr(9));
        else if (examples.length > 0) examples[examples.length - 1] += line;
        else description += line;
      }
      const hasReturn = returns && !returns.toLowerCase().includes('{void}');
      abstract = abstract ? '<span class="xyz-doc-abstract">abstract</span> ' : '';
      html += `  <div class="xyz-doc-method"><h3>${abstract}${name}(<span class="xyz-doc-signature">${Object.keys(params).join(', ')}</span>)`;
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
    write(`../../engine/doc/dev/${docPath}.html`, html)(cb);
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
const generateDocs = gulp.parallel(
  generateDoc('../../engine/connectors/connector.php', 'Connector', 'connector/connector'),

  generateDoc('../../engine/core/displays/item/item.js', 'Display', 'display/display'),
  generateDoc('./source/render/displayItem.js', 'DisplayItem', 'display/item'),

  generateDoc('../../engine/core/types/type/type.js', 'Type', 'type/type_js'),
  generateDoc('../../engine/core/types/type/type.php', 'Type', 'type/type_php'),
  generateDoc('./source/render/item.js', 'TypeItem', 'type/item'),
  generateDoc('./source/main.js', 'XYZ', 'xyz')

);
exports.build = gulp.series(generateCssFile, generateTypesFile, generateDisplaysFile, audit, pack, generateDocs);
exports.generateDocs = generateDocs;
exports.watchGulp = watchGulp;
