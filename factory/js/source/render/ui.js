const {renderUiCreate} = require('./create');
const {renderUiShare} = require('./share');
const {renderUiLogin} = require('./login');
const {renderUiElement} = require('./display');
const {renderUiInput} = require('../variables/input');

const DEFAULT_TAG = 'DIV';

const ui = (xyz, entityClasses, options, WRAPPER) => {
  options = options || {};
  for (const optionName in options) {
    if (options[optionName] === 'false') options[optionName] = false;
    if (options[optionName] === 'true') options[optionName] = true;
  }
  if (options.display === 'edit') {
    options.action = 'edit';
    options.display = 'item';
  }
  if (options.display === 'delete') {
    options.action = 'view';
    options.display = 'item';
    options.showDeleteButton = true;
  }
  let SCRIPT;
  if (!WRAPPER) {
    const tag = options.tag || DEFAULT_TAG;
    WRAPPER = document.createElement(tag);
    SCRIPT = document.currentScript;
  }
  if (options.id) WRAPPER.id = options.id;
  if (options.class) WRAPPER.className += ' ' + options.class;
  if (options.style) WRAPPER.style = options.style;

  if (SCRIPT) {
    SCRIPT.parentNode.insertBefore(WRAPPER, SCRIPT);
    SCRIPT.parentNode.removeChild(SCRIPT);
  }
  if (options.display === 'input') renderUiInput(xyz, options, WRAPPER);
  else if (options.display === 'create') renderUiCreate(xyz, entityClasses, options, WRAPPER);
  else if (options.display === 'login') renderUiLogin(xyz, options, WRAPPER);
  else if (options.display === 'share') renderUiShare(xyz, options, WRAPPER);
  else renderUiElement(xyz, options, WRAPPER);
  return WRAPPER;
};

exports.ui = ui;
