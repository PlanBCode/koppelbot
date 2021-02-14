const variables = require('./variables');
const types = require('../../build/types.js');
const TypeItem = require('../render/item.js').TypeItem;

function renderUiInput (xyz, options, WRAPPER) {
  if (options.name) {
    const name = options.name; // TODO error if missing

    const INPUT = document.createElement('INPUT');
    if (options.hasOwnProperty('type')) INPUT.type = options.type;

    if (variables.hasVariable(name)) INPUT.value = variables.getVariable(name, '');

    if (options.hasOwnProperty('value')) {
      if (variables.hasVariable(name)) {
        // TODO also set variable?
      } else {
        INPUT.value = options.value;
        variables.setVariable(name, options.value);
      }
    }

    if (options.showLabel !== false) {
      const LABEL = document.createElement('LABEL');
      LABEL.innerHTML = name + '&nbsp;';
      WRAPPER.appendChild(LABEL);
    }
    INPUT.name = name;
    INPUT.onpaste = () => variables.setVariable(name, INPUT.value);
    INPUT.oninput = () => variables.setVariable(name, INPUT.value);
    variables.onVariable(name, value => {
      INPUT.value = value;
    });
    WRAPPER.appendChild(INPUT);
  } else {
    const type = options.type || 'string';
    const value = options.value || null;
    let onChange = options.onChange || null;
    if (typeof onChange === 'string') onChange = new Function('content', 'subPropertyPath', onChange);
    const subPropertyPath = options.id ? [options.id] : [];
    const settings = {...options};
    if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
      const uri = null;
      const status = 200;
      const content = value;

      const options = {};// TODO
      const onDelete = () => {};// TODO
      const item = new TypeItem(xyz, uri, subPropertyPath, status, content, settings, options, onChange, onDelete);
      const TAG = types[type].edit(item);
      WRAPPER.appendChild(TAG);
    }
  }
}

exports.renderUiInput = renderUiInput;
