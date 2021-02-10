const entity = require('./entity/entity.js');
const request = require('./request/request.js');
const web = require('./web/web.js');
const on = require('./request/on').on;
const ui = require('./render/ui').ui;
const variables = require('./variables/variables');

function XYZ () {
  const entityClasses = {};

  this.hasVariable = variableName => variables.hasVariable(variableName);
  this.getVariable = (variableName, fallback) => variables.getVariable(variableName, fallback);
  this.clearVariable = variableName => variables.clearVariable(variableName);
  this.setVariable = (variableName, value) => variables.setVariable(variableName, value);
  this.setVariables = variableObject => variables.setVariables(variableObject);
  this.setVariables(web.getQueryParameters());

  this.select = (entityClassName, entityId, selectVariableName, selectUri) => variables.selectVariable(this, entityClassName, entityId, selectVariableName, selectUri);
  this.selectAdd = (entityClassName, entityId, selectVariableName, selectUri) => variables.selectAdd(this, entityClassName, entityId, selectVariableName, selectUri);
  this.selectRemove = (entityClassName, entityId, selectVariableName) => variables.selectRemove(this, entityClassName, entityId, selectVariableName);
  this.isSelected = (entityClassName, entityId, selectVariableName) => variables.isSelected(this, entityClassName, entityId, selectVariableName);

  this.isAutoIncremented = entityClassName => entity.isAutoIncremented(entityClasses, entityClassName);
  this.getTitlePropertyPath = entityClassName => entity.getTitlePropertyPath(entityClasses, entityClassName);
  this.getDisplayName = (entityClassName, propertyPath) => entity.getDisplayName(entityClasses, entityClassName, propertyPath);

  this.on = (uri, eventName, callback) => on(this, entityClasses, uri, eventName, callback);
  this.checkAccess = (uri, method) => entity.checkAccess(entityClasses, uri, method);
  this.ui = (options, WRAPPER) => ui(this, entityClasses, options, WRAPPER);

  this.get = (uri, callback) => request.get(this, entityClasses, uri, callback);
  this.head = (uri, callback) => request.head(uri, callback);
  this.post = (uri, content, callback) => request.post(entityClasses, uri, content, callback);
  this.patch = (uri, content, callback) => request.patch(entityClasses, uri, content, callback);
  this.put = (uri, content, callback) => request.put(entityClasses, uri, content, callback);
  this.delete = (uri, callback) => request.delete(entityClasses, uri, callback);

  this.setQueryParameter = (key, value) => web.setQueryParameter(key, value);
}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.on = xyz.on;
exports.setQueryParameter = xyz.setQueryParameter;
exports.xyz = xyz;
// TODO get(Variable)
// TODO set(Variable(s))
// TODO globals()
