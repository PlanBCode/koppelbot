const web = require('../web/web.js');
const uriTools = require('../uri/uri.js');

const variables = {};
const uriCallbacks = {};

const handleVariableChange = variableName => {
  web.setQueryParameter(variableName, variables[variableName]);
  for (let uri in uriCallbacks) {
    if (uri.indexOf('$' + variableName) !== -1) { // TODO find ${variableName} and ignore $variableNameWithPostfix
      for (let callback of uriCallbacks[uri]) {
        handleUri(uri, callback);
      }
    }
  }
};

const hasVariable = variableName => variables.hasOwnProperty(variableName);
const getVariable = (variableName, fallback) => variables.hasOwnProperty(variableName) ? variables[variableName] : fallback;

const clearVariable = variableName => {
  delete variables[variableName];
  handleVariableChange(variableName);
};

const setVariable = (variableName, value) => {
  if (value !== variables[variableName]) {
    variables[variableName] = value;
    handleVariableChange(variableName);
  }
};

const setVariables = (variableObject) => {
  for (let variableName in variableObject) {
    setVariable(variableName, variableObject[variableName]);
  }
};

function resolveVariablesInUri (uri) {
  // TODO find ${variableName}
  return uri.replace(/\$(\w+)/g, (_, variableName) => {
    if (variables.hasOwnProperty(variableName)) {
      return variables[variableName];
    } else {
      return '$' + variableName;
    }
  });
}

function uriHasUnresolvedVariables (uri) {
  return uri.includes('$');
}

function handleUri (uri, callbacks) {
  uri = resolveVariablesInUri(uri);
  if (typeof callbacks.wait === 'function') callbacks.wait(uri);
  if (!uriHasUnresolvedVariables(uri)) callbacks.ready(uri);
}

function refresh () {
  for (let uri in uriCallbacks) {
    const xyz = uriCallbacks[uri][0].xyz;
    uri = resolveVariablesInUri(uri);
    // uri starting without '/' are input variables
    if (!uriHasUnresolvedVariables(uri) && uri.startsWith('/')) xyz.get(uri);
  }
}

const registerUri = (xyz, uri, readyCallback, waitCallback) => {
  const callbacks = {xyz, ready: readyCallback, wait: waitCallback};
  if (!uriCallbacks.hasOwnProperty(uri)) {
    uriCallbacks[uri] = [callbacks];
  } else {
    uriCallbacks[uri].push(callbacks);
  }
  handleUri(uri, callbacks);
};

const selectVariable = (xyz, entityClassName, entityId, variableNameOrCallback, selectUri) => {
  if (typeof variableNameOrCallback === 'string') {
    if (typeof entityId === 'undefined' && typeof entityClassName === 'undefined') {
      xyz.clearVariable(variableNameOrCallback);
    } else {
      const uriPostfix = selectUri || '';
      const includeEntityClass = typeof entityClassName !== 'undefined';
      const value = includeEntityClass
        ? '/' + entityClassName + '/' + entityId
        : entityId;
      xyz.setVariable(variableNameOrCallback, value + uriPostfix);
    }
  } else if (typeof variableNameOrCallback === 'function') {
    variableNameOrCallback(entityClassName, entityId);
  }
};

function selectAdd (xyz, entityClassName, entityId, selectVariableName, selectUri) {
  // TODO how to handle mixed entityClasses?
  if (hasVariable(selectVariableName)) {
    const uri = getVariable(selectVariableName);
    const path = uriTools.pathFromUri(uri);
    const includeEntityClass = typeof entityClassName !== 'undefined';
    const offset = includeEntityClass ? 1 : 0;
    if (path.length <= offset) return;
    const entityIds = path[offset].split(',');
    if (entityIds.includes(entityId)) return; // already selected, nothing to do
    entityIds.push(entityId);
    path[offset] = entityIds.join(',');
    const newUri = includeEntityClass ? uriTools.uriFromPath(path) : path[offset];
    xyz.setVariable(selectVariableName, newUri);
  } else selectVariable(xyz, entityClassName, entityId, selectVariableName, selectUri);
}

function selectRemove (xyz, entityClassName, entityId, selectVariableName) {
  // TODO how to handle mixed entityClasses?
  if (!hasVariable(selectVariableName)) return; // nothing selected, so nothing to do
  const uri = getVariable(selectVariableName);
  const path = uriTools.pathFromUri(uri);
  const includeEntityClass = typeof entityClassName !== 'undefined';
  const offset = includeEntityClass ? 1 : 0;
  if (path.length <= offset) return;
  const entityIds = path[offset].split(',');
  const index = entityIds.indexOf(entityId);
  if (index !== -1) entityIds.splice(index, 1);
  if (entityIds.length === 0) selectVariable(xyz, undefined, undefined, selectVariableName);
  else {
    path[offset] = entityIds.join(',');
    const newUri = includeEntityClass ? uriTools.uriFromPath(path) : path[offset];
    xyz.setVariable(selectVariableName, newUri);
  }
}

function isSelected (xyz, entityClassName, entityId, selectVariableName) {
  // TODO how to handle mixed entityClasses?
  if (!hasVariable(selectVariableName)) return false;
  const uri = getVariable(selectVariableName);
  const path = uriTools.pathFromUri(uri);
  const includeEntityClass = typeof entityClassName !== 'undefined';
  const offset = includeEntityClass ? 1 : 0;
  if (path.length <= offset) return;
  const entityIds = path[offset].split(',');
  return entityIds.includes(entityId);
}

setInterval(refresh, 1000);

exports.selectVariable = selectVariable;
exports.selectAdd = selectAdd;
exports.selectRemove = selectRemove;
exports.isSelected = isSelected;

exports.getVariable = getVariable;
exports.hasVariable = hasVariable;
exports.setVariable = setVariable;
exports.setVariables = setVariables;
exports.clearVariable = clearVariable;
exports.registerUri = registerUri;
