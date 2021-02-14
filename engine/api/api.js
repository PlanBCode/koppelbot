const INPUT_uri = document.getElementById('xyz-api-uri');
const INPUT_entityId = document.getElementById('xyz-api-entityId');
const INPUT_property = document.getElementById('xyz-api-property');
const SPAN_command = document.getElementById('xyz-api-command');
const SELECT_commandFlavor = document.getElementById('xyz-api-commandFlavor');
const SELECT_method = document.getElementById('xyz-api-method');
const INPUT_data = document.getElementById('xyz-api-data');
const TD_result = document.getElementById('xyz-api-result');
const TD_status = document.getElementById('xyz-api-status');

const ui = !SELECT_commandFlavor;

let onUiChange;

if (ui) {
  const uri = window.location.pathname.substr(3); // '/ui/a/b/c/' -> '/a/b/c'
  const path = uri.substr(1).split('/'); // '/a/b/c/' -> ['a','b','c']

  if (document.activeElement !== INPUT_uri) INPUT_uri.value = uri;
  xyz.setVariable('entityClass', path[0]);
  if (document.activeElement !== INPUT_entityId) INPUT_entityId.value = path[1] || '';
  if (document.activeElement !== INPUT_property) INPUT_property.value = path.slice(2).join('/');
} else {
  if (document.activeElement !== INPUT_uri)INPUT_uri.value = xyz.getQueryParameter('uri') || '';
  if (document.activeElement !== INPUT_entityId) INPUT_entityId.value = xyz.getQueryParameter('entityId') || '';
  if (document.activeElement !== INPUT_property) INPUT_property.value = xyz.getQueryParameter('property') || '';
  SELECT_commandFlavor.value = xyz.getQueryParameter('commandFlavor') || 'url';
  SELECT_method.value = xyz.getQueryParameter('method') || 'GET';
  if (document.activeElement !== INPUT_data) INPUT_data.value = xyz.getQueryParameter('data') || '';
}

INPUT_uri.oninput = INPUT_uri.onpaste = () => {
  const uri = INPUT_uri.value;
  const path = uri.substr(1).split('/');
  const entityClass = path[0] || '';
  const entityId = path[1] || '';
  const property = path.slice(2).join('/');
  xyz.setVariable('entityClass', entityClass);
  if (document.activeElement !== INPUT_entityId) INPUT_entityId.value = entityId;
  if (document.activeElement !== INPUT_property) INPUT_property.value = property;
  if (onUiChange) onUiChange(); // ./engine/ui/ui.js
  onCommandChange();
};

function onPathChange () {
  const entityClass = xyz.getVariable('entityClass') || '';
  const entityId = INPUT_entityId.value;
  const property = INPUT_property.value;
  let uri = '/' + entityClass;
  if (entityId) uri += '/' + entityId;
  else if (property) uri += '/*';
  if (property) uri += '/' + property;
  if (document.activeElement !== INPUT_uri) INPUT_uri.value = uri;
  if (onUiChange) onUiChange(); // ./engine/ui/ui.js
  onCommandChange();
}

function onMethodChange () {
  if (ui) return;
  const method = SELECT_method.value;
  if (['HEAD', 'DELETE', 'GET'].includes(method)) INPUT_data.disabled = true;
  else INPUT_data.disabled = false;
  onCommandChange();
}

function onCommandChange () {
  if (ui) return;
  const uri = INPUT_uri.value;
  let method = SELECT_method.value;
  let data = INPUT_data.value;
  const path = uri.substr(1).split('/');
  const entityId = path[1] || '';
  const property = path.slice(2).join('/');
  const flavor = SELECT_commandFlavor.value;

  xyz.setQueryParameter('data', data);
  xyz.setQueryParameter('uri', uri);
  xyz.setQueryParameter('entityId', entityId);
  xyz.setQueryParameter('property', property);
  xyz.setQueryParameter('method', method);
  xyz.setQueryParameter('commandFlavor', flavor);
  // TODO add querystring
  switch (flavor) {
    case 'curl' :
      if (['HEAD', 'DELETE', 'GET'].includes(method)) data = '';
      else data = '-d ' + '"' + data.replace(/"/g, '\\"') + '"' + ' ';

      if (method === 'GET') method = '';
      else method = '-X ' + method + ' ';
      SPAN_command.innerText = 'curl ' + method + data + '"' + window.location.origin + window.location.pathname + uri + '"';
      break;
    case 'ui' :
      {
        let d = 'list';
        if (method === 'DELETE') d = 'delete';
        if (method === 'POST' || method === 'PUT') d = 'create';
        if (method === 'PATCH') d = 'edit';
        SPAN_command.innerHTML = '&lt;xyz uri="' + uri + '" display="' + d + '"/&gt; <a target="_blank" href="./ui' + uri + '">More...</a>';
      }
      break;
    case 'url' :
    { const url = window.location.origin + window.location.pathname + uri;
      SPAN_command.innerHTML = `<a target="_blank" href="${url}">${url}</a>`;
      break;
    }
    case 'cli' :
      if (['HEAD', 'DELETE', 'GET'].includes(method)) data = '';
      else data = ' ' + '"' + data.replace(/"/g, '\\"') + '"';

      if (method === 'GET') method = '';
      else method = '--method ' + method + ' ';
      SPAN_command.innerText = './xyz ' + method + '"' + uri + '"' + data;
      break;
    case 'embed' : {
      if (['HEAD', 'DELETE', 'GET'].includes(method)) data = '';
      else data = ' ' + '"' + data.replace(/"/g, '\\"') + '"';

      if (method === 'GET') method = '';
      else method = '--method ' + method + ' ';
      const url = window.location.origin + '/ui' + window.location.pathname.substr(4) + uri + (uri.includes('?') ? '&' : '?') + 'embed';
      SPAN_command.innerText = `<iframe src="${url}" title="XYZ"></iframe>`;

      break;
    }
  }
}

function execute () {
  const uri = INPUT_uri.value;
  const method = SELECT_method.value;
  const data = INPUT_data.value;
  const xhr = new window.XMLHttpRequest();
  const location = window.location.origin + '/';

  xhr.open(method, location + 'api' + uri, true);

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      const status = xhr.status;// TODO use
      const content = xhr.responseText;
      const ok = status >= 200 && status < 400;

      let text;
      if (status === 207) text = 'Mixed ';
      else if (ok) text = 'OK';
      else if (status === 400) text = 'Bad Request';
      else if (status === 403) text = 'Forbidden';
      else if (status === 404) text = 'Not found';
      else if (status >= 0) text = 'Server Error';
      let color;
      if (status === 207) color = 'orange';
      else if (ok) color = 'green';
      else color = 'red';

      TD_status.innerHTML = status + ' ' + text;
      TD_status.style.color = color;
      TD_result.innerHTML = content;
    }
  };
  xhr.send(data);
}

INPUT_entityId.oninput = INPUT_entityId.onpaste = onPathChange;
INPUT_property.oninput = INPUT_property.onpaste = onPathChange;
if (!ui) INPUT_data.oninput = INPUT_data.onpaste = onCommandChange;

xyz.onVariable('entityClass', onPathChange);
onPathChange();
onMethodChange();
