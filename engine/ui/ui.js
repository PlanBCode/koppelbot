/* global optionSchemas  */ // is defined in /engine/ui.php

const SELECT_macroFlavor = document.getElementById('xyz-ui-display-macroFlavor');
const PRE_macro = document.getElementById('xyz-ui-display-macro');
const TABLE_variables = document.getElementById('xyz-ui-display-variables');
let displayName = xyz.getQueryParameter('display') || 'list';

const uri = window.location.pathname.substr(3); // '/ui/$entityClassName/...' -> '$entityClassName'  TODO
const filters = xyz.getQueryFilters();
let queryString = '';
let first = true;
for (const id in filters) {
  if (first) {
    first = false;
    queryString += '?';
  } else queryString += '&';
  queryString += id + filters[id].join('');
}

const options = {
  id: 'xyz-ui-display',
  uri: uri + queryString,
  display: displayName,
  ...xyz.getQueryParameters()
};

optionSchemas.edit = JSON.parse(JSON.stringify(optionSchemas.item));
optionSchemas.delete = JSON.parse(JSON.stringify(optionSchemas.item));
optionSchemas.edit.options.action.default = 'edit';
optionSchemas.delete.options.showDeleteButton.default = true;

for (const optionName in options) {
  const option = options[optionName];
  if (option === 'false') options[optionName] = false;
  if (option === 'true') options[optionName] = true;
}

function match (content, defaultContent) {
  return content === defaultContent || (typeof defaultContent === 'undefined' && content === '');
}

function addQueryFiltersToUri (uri) {
  const filters = xyz.getQueryFilters();
  for (const id in filters) {
    const [operator, value] = filters[id];
    uri += (uri.includes('?') ? '&' : '?') + id + operator + value;
  }
  return uri;
}

function render () {
  const WRAPPER = document.getElementById('xyz-ui-display');

  const uri = addQueryFiltersToUri(options.uri);

  const displayOptions = {
    ...options,
    id: 'xyz-ui-display',
    uri
  };

  if (displayOptions.display === 'edit') {
    displayOptions.display = 'item';
    displayOptions.action = displayOptions.action || 'edit';
  }
  if (displayOptions.display === 'delete') {
    displayOptions.display = 'item';
    displayOptions.showDeleteButton = typeof displayOptions.showDeleteButton === 'undefined' ? true : displayOptions.showDeleteButton;
  }
  if (WRAPPER) xyz.ui(displayOptions, WRAPPER);
}

onUiChange = (content, optionName) => { // declared in /engine/api/api.js
  options.uri = INPUT_uri.value;

  window.history.pushState({html: null, pageTitle: document.title}, '', window.location.origin + '/ui' + options.uri + window.location.search);

  const entityClassName = options.uri.substr(1).split('/')[0];
  if (!entityClassName) return;
  if (optionName) {
    if (typeof content === 'undefined' || content === '') delete options[optionName];
    else options[optionName] = content;

    const defaultContent = optionSchemas[displayName].options[optionName].default;
    if (match(content, defaultContent)) content = undefined;
    xyz.setQueryParameter(optionName, content);
  }
  render();

  if (optionName === 'display') {
    displayName = content;
    updateOptions();
  }
  updateMacro();
};

function updateOptions () {
  const TABLE = document.getElementById('xyz-ui-display-options');
  for (const TR of [...TABLE.firstElementChild.children]) {
    if (!TR.classList.contains('xyz-list-header')) {
      try {
        TABLE.removeChild(TR);
      } catch (e) {

      }
    }
  }

  if (!displayName) displayName = 'list';
  for (const optionName in optionSchemas[displayName].options) {
    const settings = optionSchemas[displayName].options[optionName];
    const info = settings.info || '<i>No description available.</i>';
    const type = settings.type || 'string';
    const value = options.hasOwnProperty(optionName) ? options[optionName] : (settings.default || '');
    const uiOptions = {
      display: 'input',
      id: optionName,
      value,
      type,
      onChange: content => onUiChange(content, optionName),
      ...settings
    };
    const TR = document.createElement('TR');
    TR.innerHTML = `<td>${optionName}</td><td>${info}</td>`;
    const TD = document.createElement('TD');
    TR.appendChild(TD);
    TABLE.firstElementChild.appendChild(TR);
    xyz.ui(uiOptions, TD);
  }
}

function sanitizeMacroUri (uri) {
  // addQueryFiltersToUri(
  const [base, queryString] = uri.split('?');
  if (queryString) {
    uri = base;
    let first = true;
    for (const keyval of queryString.split('&')) {
      const [key, value] = keyval.split('=');
      if (!optionSchemas[displayName].options.hasOwnProperty(key)) {
        if (first) {
          first = false;
          uri += '?';
        } else uri += '&';
        uri += keyval;
      }
    }
  }
  return addQueryFiltersToUri(uri);
}

function updateMacro () {
  const macroFlavor = SELECT_macroFlavor.value;
  // TODO filters & query options
  if (macroFlavor === 'ui') {
    let text = '<xyz';
    for (const optionName in options) {
      let content = options[optionName];
      if (optionName === 'id' || optionName === 'aggregations') continue;
      if (optionName === 'uri') content = sanitizeMacroUri(content);

      const defaultContent = optionSchemas[displayName].options.hasOwnProperty(optionName) ? optionSchemas[displayName].options[optionName].default : undefined;
      if (!match(content, defaultContent)) text += ' ' + optionName + '="' + content + '"';
    }
    PRE_macro.innerText = text + '/>';
  } else if (macroFlavor === 'embed') {
    let uri = '/ui' + sanitizeMacroUri(options.uri);
    uri += (uri.includes('?') ? '&' : '?') + 'embed';
    for (const optionName in options) {
      const content = options[optionName];
      if (optionName === 'entityClass' || optionName === 'uri' || optionName === 'id' || optionName === 'aggregations') continue;

      const defaultContent = optionSchemas[displayName].options.hasOwnProperty(optionName) ? optionSchemas[displayName].options[optionName].default : undefined;
      if (!match(content, defaultContent)) uri += '&' + optionName + '=' + content;
    }
    const url = window.location.origin + uri;
    PRE_macro.innerText = `<iframe src="${url}" title="XYZ"></iframe>`;
  } else if (macroFlavor === 'api') {
    const uri = sanitizeMacroUri(options.uri);
    const path = uri.substr(1).split('/');
    const entityClass = path[0];
    const entityId = path[1];
    const property = path.slice(2).join('/');
    const moreUri = `/api?entityClass=${entityClass}&id=${entityId}&property=${property}`;
    const url = window.location.origin + '/api' + uri;
    PRE_macro.innerHTML = `<a href="${url}" target="_black">${url}</a> <a target="_blank" href="${window.location.origin}${moreUri}">More...</a>`;
  }
}

const INPUTsByVariableName = {};
function onVariableChange (value, variableName) {
  if (variableName === 'entityClass' || optionSchemas[displayName].options.hasOwnProperty(variableName)) return;

  if (Object.keys(INPUTsByVariableName).length === 0) {
    TABLE_variables.innerHTML = '<tr class="xyz-list-header"><td>VariableName</td><td>Value</td></tr>';
  }
  if (!INPUTsByVariableName.hasOwnProperty(variableName)) {
    const TR = document.createElement('TR');
    const TD_variableName = document.createElement('TD');
    TD_variableName.innerText = variableName;
    const TD_value = document.createElement('TD');
    TR.appendChild(TD_variableName);
    TR.appendChild(TD_value);

    const INPUT = document.createElement('INPUT');
    INPUT.value = value;
    INPUT.id = `xyz-ui-variable-${variableName}`;

    INPUT.onchange = () => {
      if (INPUT.value === '') xyz.clearVariable(variableName);
      else xyz.setVariable(variableName, INPUT.value);
    };

    TD_value.appendChild(INPUT);

    TABLE_variables.appendChild(TR);
    INPUTsByVariableName[variableName] = INPUT;
  } else {
    const INPUT = INPUTsByVariableName[variableName];
    if (document.activeElement !== INPUT) INPUT.value = value || '';
  }
}

if (SELECT_macroFlavor) {
  const variables = xyz.getVariables();
  for (const variableName in variables) onVariableChange(variables[variableName], variableName);

  xyz.onVariable('*', onVariableChange);

  onUiChange(displayName, 'display');
  updateOptions();
} else render();
