const {StringStorage} = require('./stringstorage');

function parse (data) {
  if (data === null) return {parsedData: {}};
  else {
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      console.error(error);
      return {error: 500, message: 'Parsing error'};
    }
    return {parsedData};
  }
}

function stringify (parsedData) {
  return JSON.stringify(parsedData);
}

function getData (settings) {
  const root = settings.root;
  return window.localStorage.getItem(root);
}

function setData (settings, data) {
  const root = settings.root;
  window.localStorage.setItem(root, data);
}

const localStorage = new StringStorage(getData, setData, parse, stringify);
exports.get = localStorage.get;
exports.head = localStorage.head;
exports.put = localStorage.put;
exports.post = localStorage.post;
exports.patch = localStorage.patch;
exports.delete = localStorage.delete;
