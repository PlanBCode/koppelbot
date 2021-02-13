//  optionSchemas is defined in /engine/ui.php
const SELECT_macroFlavor = document.getElementById('xyz-ui-display-macroFlavor');
const PRE_macro = document.getElementById('xyz-ui-display-macro');
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

onUiChange = (content, subPropertyPath) => { // declared in /engine/api/api.js
  options.uri = INPUT_uri.value;

  window.history.pushState({html: null, pageTitle: document.title}, '', window.location.origin + '/ui' + options.uri + window.location.search);

  const entityClassName = options.uri.substr(1).split('/')[0];
  if (!entityClassName) return;
  const optionName = (subPropertyPath instanceof Array) ? subPropertyPath[0] : null;
  if (optionName) {
    options[optionName] = content;
    const defaultContent = optionSchemas[displayName].options[optionName].default;
    if (match(content, defaultContent)) content = undefined;
    xyz.setQueryParameter(optionName, content);
  }
  const WRAPPER = document.getElementById('xyz-ui-display');
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

  if (optionName === 'display') {
    displayName = content;
    updateOptions();
  }
  updateMacro();
};

function updateOptions () {
  const TABLE = document.getElementById('xyz-ui-display-options');
  TABLE.innerHTML = '<tr class="xyz-list-header"><td>Display Option</td><td>Description</td><td>Value</td></tr>';
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
      onChange: (content, subPropertyPath) => onUiChange(content, subPropertyPath),
      ...settings
    };
    const TR = document.createElement('TR');
    TR.innerHTML = `<td>${optionName}</td><td>${info}</td>`;
    const TD = document.createElement('TD');
    TR.appendChild(TD);
    TABLE.appendChild(TR);
    xyz.ui(uiOptions, TD);
  }
}
function sanitizeMacroUri (content) {
  const [base, queryString] = content.split('?');
  if (queryString) {
    content = base;
    let first = true;
    for (const keyval of queryString.split('&')) {
      const [key, value] = keyval.split('=');
      if (!optionSchemas[displayName].options.hasOwnProperty(key)) {
        if (first) {
          first = false;
          content += '?';
        } else content += '&';
        content += keyval;
      }
    }
  }
  return content;
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
onUiChange(displayName, ['display']);
