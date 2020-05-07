const entity = require('./entity/entity.js');
const request = require('./request/request.js');
const web = require('./web/web.js');
const on = require('./request/on').on;
const ui = require('./render/ui').ui;
const variables = require('./variables/variables');

function XYZ() {
    const entityClasses = {};

    this.hasVariable = variableName => variables.hasVariable(variableName);
    this.getVariable = (variableName, fallback) => variables.getVariable(variableName, fallback);
    this.clearVariable = variableName => variables.clearVariable(variableName);
    this.setVariable = (variableName, value) => variables.setVariable(variableName, value);
    this.setVariables = variableObject => variables.setVariables(variableObject);
    this.setVariables(web.getQueryParameters());

    this.isAutoIncremented = entityClassName => entity.isAutoIncremented(entityClasses, entityClassName);
    this.getTitlePropertyPath = entityClassName => entity.getTitlePropertyPath(entityClasses, entityClassName);
    this.getDisplayName = (entityClassName, propertyPath) => entity.getDisplayName(entityClasses, entityClassName, propertyPath);

    this.on = (uri, eventName, callback) => on(this, entityClasses, uri, eventName, callback);
    this.checkAccess = (uri, method) => entity.checkAccess(entityClasses, uri, method);
    this.ui = (options, WRAPPER) => ui(this, entityClasses, options, WRAPPER);

    this.get = (uri, callback) => request.get(this, entityClasses, uri, callback);
    this.head = (uri) => request.head(entityClasses, uri);
    this.post = (uri, content) => request.post(entityClasses, uri, content);
    this.patch = (uri, content) => request.patch(entityClasses, uri, content);
    this.put = (uri, content) => request.put(entityClasses, uri, content);
    this.delete = uri => request.delete(entityClasses, uri);
}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.on = xyz.on;
exports.xyz = xyz;
//TODO get(Variable)
//TODO set(Variable(s))
//TODO globals()

