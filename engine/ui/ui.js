//  optionSchemas is defined in /engine/ui.php

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

console.log(queryString);
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

function rerender (content, subPropertyPath) {
  const optionName = subPropertyPath[0];
  options[optionName] = content;
  const defaultContent = optionSchemas[displayName].options[optionName].default;
  if (match(content, defaultContent)) content = undefined;
  xyz.setQueryParameter(optionName, content);
  const WRAPPER = document.getElementById('xyz-ui-display');
  const x = {...options};
  if (x.display === 'edit') {
    x.display = 'item';
    x.action = x.action || 'edit';
  }
  if (x.display === 'delete') {
    x.display = 'item';
    x.showDeleteButton = typeof x.showDeleteButton === 'undefined' ? true : x.showDeleteButton;
  }
  console.log('x', x);
  xyz.ui(x, WRAPPER);
  if (subPropertyPath[0] === 'display') {
    displayName = content;
    updateOptions();
  }
  updateMacro();
}

function updateOptions () {
  const TABLE = document.getElementById('xyz-ui-display-options');
  TABLE.innerHTML = '<tr class="xyz-list-header"><td>Option</td><td>Description</td><td>Value</td></tr>';
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
      onChange: (content, subPropertyPath) => rerender(content, subPropertyPath),
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

function updateMacro () {
  let text = '<xyz';
  for (const optionName in options) {
    let content = options[optionName];
    if (optionName === 'id' || optionName === 'aggregations') continue;
    if (optionName === 'uri') {
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
    }
    const defaultContent = optionSchemas[displayName].options.hasOwnProperty(optionName) ? optionSchemas[displayName].options[optionName].default : undefined;
    if (!match(content, defaultContent)) text += ' ' + optionName + '="' + content + '"';
  }
  document.getElementById('xyz-ui-display-macro').innerText = text + '/>';
}
rerender(displayName, ['display']);
