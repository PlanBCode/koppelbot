const fs = require('fs');

const string = fs.readFileSync('./factory/js/source/render/display.js').toString();
const regex = /(\*\*\s*\n([^*]|\*[^/])*\*\/)\s*this\.(?<function>\w+)/g;
let x;
let html = `<table>
  <h1>Display</h1>\n`;

while ((x = regex.exec(string))) {
  const name = x.groups.function;
  const lines = x[1]
    .split('\n')
    .filter(line => line.startsWith('   * '))
    .map(line => line.substr(5));
  let description = '';
  const examples = [];
  let returns = '{void}';
  const params = {};
  for (const line of lines) {
    if (line.startsWith('@param')) {
      const [type, name, ...description] = line.substr(7).split(' ');
      params[name] = {type, description};
      // @param {string} target
    } else if (line.startsWith('@returns')) returns = line.substr(9);
    else if (line.startsWith('@example')) examples.push(line.substr(9));
    else if (examples.length > 0) examples[examples.length - 1] += line;
    else description += line;
  }
  html += `  <tr><td colspan="3">${name}</td></tr>
  <tr><td colspan="3">${description}</td></tr>\n`;
  for (const id in params) {
    html += `  <tr><td>${id}</td><td>${params[id].type}</td><td>${params[id].description}</td></tr>\n`
    ;
  }
  html += `  <tr><td>Returns</td><td colspan=2">${returns}</td></tr>\n`;
}
console.log(html + '</table>');
