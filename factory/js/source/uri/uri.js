const variables = require('../variables/variables.js');

const web = require('../web/web.js');

const pathFromUri = uri => {
  uri = uri.split('?')[0]; // remove querystring
  if (uri.startsWith('/')) {
    uri = uri.substr(1);
  }
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }
  return uri.split('/');
};

const uriFromPath = path => '/' + path.join('/');

const wrapContent = (uri, content) => {
  const wrapper = {};
  const path = pathFromUri(uri);
  let wrapperIterator = wrapper;
  for (let depth = 0; depth < path.length; ++depth) {
    const key = path[depth];
    wrapperIterator = wrapperIterator[key] = (depth === path.length - 1) ? content : {};
  }
  return wrapper;
};

const getEntityClassNames = (uri, entityClasses) => {
  const path = pathFromUri(uri);
  const entityClassNameList = path[0] || '*';
  if (entityClassNameList === '*') {
    return Object.keys(entityClasses);
  } else {
    return entityClassNameList.split(','); // TODO check if exist
  }
};

const getBaseRequestUri = uri => {
  const path = pathFromUri(uri);
  if (path.length === 1) return '/' + path[0] + '/*';
  else if (path.length === 0) console.error('PROBLEM ERROR'); // TODO
  else return '/' + path[0] + '/' + path[1];
};

/**
 * Get entityClass and entityId part of uri's only  '/a/b/c/' -> '/a/b'
 * @param  {string} uri [description]
 * @returns {string}     [description]
 */
const getBaseUri = uri => uri.split(';').map(requestUri => getBaseRequestUri(requestUri)).join(';');

function getQueryParameter (uri, queryParameterName) {
  return uri.includes('?')
    ? web.getQueryParameter(queryParameterName, uri.split('?')[1])
    : undefined;
}

function setQueryParameter (uri, queryParameterName, value, operator = '=') {
  return uri.split('?')[0] + '?' +
  (
    uri.includes('?')
      ? web.setQueryParameter(queryParameterName, value, operator, uri.split('?')[1])
      : queryParameterName + operator + value
  );
}

function setQueryParameters (uri, queryParameters, operator = '=') {
  return uri.split('?')[0] + '?' +
  (
    uri.includes('?')
      ? web.setQueryParameters(queryParameters, operator, uri.split('?')[1])
      : Object.entries(queryParameters) // {a:'b',c:'d'} -> [['a','b'],['c','d']]
        .map(([queryParameterName, value]) => queryParameterName + operator + value) // [['a','b'],['c','d']] -> ['a=b','c=d']
        .join('&') //  ['a=b','c=d'] ->  'a=b&c=d'
  );
}

// '/$entityClassName/$entityId/sum(x),x?q' -> '/$entityClassName/$entityId/x,y?q'  and ['sum','x']
function parseAggregationFromUri (uri) {
  const queryString = uri.split('?')[1];

  const aggregations = [];

  const path = pathFromUri(uri);
  if (path.length < 3 || path.length[2] === '*' || (!path[2].includes('(') && !path[2].includes('='))) return {uri, aggregations};
  const parts = path[2].split(',');
  const propertyNameList = [];
  const labels = {};
  for (let part of parts) { // TODO parse aggregations with multiple parameters?  "join(x,',')"
    if (part.includes('=')) {
      let label;
      [label, part] = part.split('=');
      labels[part] = label;
    }
    if (part.endsWith(')')) {
      part = part.substr(0, part.length - 1); // 'sum(x)' -> 'sum(x'
      const aggregation = part.split('('); // 'sum(x' -> ['sum','x']
      const propertyName = aggregation[1];
      if (!propertyNameList.includes(propertyName)) propertyNameList.push(propertyName);
      aggregations.push(aggregation);
    } else if (!propertyNameList.includes(part)) propertyNameList.push(part);
  }
  uri = '/' + path.slice(0, 2).join('/') + '/' + propertyNameList.join(',') + (queryString ? '?' + queryString : '');

  return {uri, aggregations, labels};
}

// handle '$variableName'
// '${variableName}'
//  '${/entityClassName/entityId/propertyName}'
//  '${/entityClassName/$otherVariable/propertyName}'
const variableNameRegex = /\$(\w+|\{[\w/${}*,]+\})/g;

function resolveVariablesInUri (uri, contentVariables) {
  // TODO handle nested variables
  return uri.replace(variableNameRegex,
    (_, variableName) => {
      if (variableName.startsWith('{') && variableName.endsWith('}')) variableName = variableName.substr(1, variableName.length - 2);
      variableName = resolveVariablesInUri(variableName, contentVariables); // handle nested variables
      if (variables.hasVariable(variableName)) return variables.getVariable(variableName);
      else if (contentVariables.hasOwnProperty(variableName)) return contentVariables[variableName];
      else return '${' + variableName + '}';
    }
  );
}

function getVariableNamesFromUri (uri) {
  const variableNames = [];
  const nestedVariableNames = [];
  let match;
  while ((match = variableNameRegex.exec(uri))) {
    let variableName = match[1];
    if (variableName.startsWith('{') && variableName.endsWith('}')) variableName = variableName.substr(1, variableName.length - 2);
    if (variableName.includes('$')) nestedVariableNames.push(variableName);
    variableNames.push(variableName);
  }
  for (const nestedVariableName of nestedVariableNames) { // cannot be done inside while loop above, as exec has internal counter
    variableNames.push(...getVariableNamesFromUri(nestedVariableName));
  }
  return variableNames;
}

function uriHasUnresolvedVariables (uri) {
  return uri.includes('$');
}

function multiSetQueryParameter (uri, queryParameterName, value, operator) {
  return uri.split(';').map(requestUri => setQueryParameter(requestUri, queryParameterName, value, operator)).join(';');
}

function multiSetQueryParameters (uri, queryParameters, operator) {
  return uri.split(';').map(requestUri => setQueryParameters(requestUri, queryParameters, operator)).join(';');
}

function getQueryFilters (uri) {
  if (!uri.includes('?')) return {};
  return web.getQueryFilters('?' + uri.split('?')[1]);
}

exports.getVariableNamesFromUri = getVariableNamesFromUri;
exports.uriHasUnresolvedVariables = uriHasUnresolvedVariables;
exports.resolveVariablesInUri = resolveVariablesInUri;

exports.parseAggregationFromUri = parseAggregationFromUri;
exports.getBaseUri = getBaseUri;
exports.getEntityClassNames = getEntityClassNames;
exports.pathFromUri = pathFromUri;
exports.uriFromPath = uriFromPath;
exports.wrapContent = wrapContent;

exports.getQueryParameter = getQueryParameter;
exports.setQueryParameter = setQueryParameter;
exports.setQueryParameters = setQueryParameters;
exports.multiSetQueryParameter = multiSetQueryParameter;
exports.multiSetQueryParameters = multiSetQueryParameters;

exports.getQueryFilters = getQueryFilters;
