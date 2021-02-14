const web = require('../web/web.js');
const uriTools = require('../uri/uri.js');

const variables = {};
const variableCallbacks = {};

function onVariable (variableNameEventName, callback) {
  if (typeof callback !== 'function') throw new TypeError('Expected callback function.');
  if (typeof variableNameEventName !== 'string') return;
  let [variableName, eventName] = variableNameEventName.split(':');
  if (!eventName) eventName = 'change';
  if (!['change', 'clear', 'create'].includes(eventName)) throw new Error(`Illegal variable event '${eventName}'`);

  if (!variableCallbacks.hasOwnProperty(variableName)) variableCallbacks[variableName] = {};
  if (!variableCallbacks[variableName].hasOwnProperty(eventName)) variableCallbacks[variableName][eventName] = [];
  variableCallbacks[variableName][eventName].push(callback);
}

const handleVariableChange = (variableName, eventName) => {
  web.setQueryParameter(variableName, variables[variableName]);
  if (variableCallbacks.hasOwnProperty(variableName)) {
    const value = variables[variableName];
    if (variableCallbacks[variableName].hasOwnProperty('change')) {
      for (const callback of variableCallbacks[variableName].change) callback(value);
    } else if (eventName !== 'change' && variableCallbacks[variableName].hasOwnProperty(eventName)) {
      for (const callback of variableCallbacks[variableName][eventName]) callback(value);
    }
  }
};

const hasVariable = variableName => variables.hasOwnProperty(variableName);
const getVariable = (variableName, fallback) => variables.hasOwnProperty(variableName) ? variables[variableName] : fallback;

const clearVariable = variableName => {
  delete variables[variableName];
  handleVariableChange(variableName, 'clear');
};

const setVariable = (variableName, value) => {
  if (value !== variables[variableName]) {
    const isNew = !variables.hasOwnProperty(variableName);
    variables[variableName] = value;
    handleVariableChange(variableName, isNew ? 'create' : 'change');
  }
};

const setVariables = (variableObject) => {
  for (const variableName in variableObject) { setVariable(variableName, variableObject[variableName]); }
};

const selectVariable = (xyz, entityClassName, entityId, variableNameOrCallback, selectUri) => {
  if (typeof variableNameOrCallback === 'string') {
    if (typeof entityId === 'undefined' && typeof entityClassName === 'undefined') {
      xyz.clearVariable(variableNameOrCallback);
    } else {
      const uriPostfix = selectUri || '';
      const includeEntityClass = false; // TODO
      const value = includeEntityClass
        ? '/' + entityClassName + '/' + entityId
        : entityId;

      xyz.setVariable(variableNameOrCallback, value + uriPostfix);
    }
  } else if (typeof variableNameOrCallback === 'function') variableNameOrCallback(entityClassName, entityId);
};

function selectAdd (xyz, entityClassName, entityId, selectVariableName, selectUri) {
  // TODO how to handle mixed entityClasses?
  if (hasVariable(selectVariableName)) {
    const uri = getVariable(selectVariableName);
    const path = uriTools.pathFromUri(uri);
    const includeEntityClass = false; // TODO
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
  const includeEntityClass = false; // TODO
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
  const includeEntityClass = false; // TODO
  const offset = includeEntityClass ? 1 : 0;
  if (path.length <= offset) return;
  const entityIds = path[offset].split(',');
  return entityIds.includes(entityId);
}

exports.selectVariable = selectVariable;
exports.selectAdd = selectAdd;
exports.selectRemove = selectRemove;
exports.isSelected = isSelected;

exports.getVariable = getVariable;
exports.hasVariable = hasVariable;
exports.setVariable = setVariable;
exports.setVariables = setVariables;
exports.clearVariable = clearVariable;
exports.onVariable = onVariable;
