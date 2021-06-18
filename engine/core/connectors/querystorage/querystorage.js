const {StringStorage} = require('../localstorage/stringstorage');
const vars = require('../../../../factory/js/source/variables/variables');

function parse (data) {
  if (typeof data === 'undefined') return {parsedData: {}};
  else {
    const parsedData = Object.fromEntries(data.split(',').map(pair => {
      const [entityId, value] = pair.split(':');
      return [entityId, {key: entityId, value}];
    }));
    return {parsedData};
  }
}

function stringify (parsedData) {
  return Object.entries(parsedData)
    .map(([key, content]) => `${key}:${content.value}`)
    .join(',');
}

function getData (settings) {
  const root = settings.root;
  return vars.getVariable(root);
}

function setData (settings, data) {
  const root = settings.root;
  vars.setVariable(root, data);
}

const localStorage = new StringStorage(getData, setData, parse, stringify);
exports.get = localStorage.get;
exports.head = localStorage.head;
exports.put = localStorage.put;
exports.post = localStorage.post;
exports.patch = localStorage.patch;
exports.delete = localStorage.delete;
