const entity = require('./entity/entity.js');
const request = require('./request/request.js');
const web = require('./web/web.js');
const on = require('./request/on').on;
const ui = require('./render/ui').ui;
const variables = require('./variables/variables');
require('./web/ui');

function XYZ () {
  const entityClasses = {};

  this.isAutoIncremented = entityClassName => entity.isAutoIncremented(entityClasses, entityClassName);
  this.getTitlePropertyPath = entityClassName => entity.getTitlePropertyPath(entityClasses, entityClassName);
  this.getDisplayName = (entityClassName, propertyPath) => entity.getDisplayName(entityClasses, entityClassName, propertyPath);

  this.on = (uri, eventName, callback) => on(this, entityClasses, uri, eventName, callback);
  this.ui = (options, WRAPPER) => ui(this, entityClasses, options, WRAPPER);
  this.checkAccess = (uri, method) => entity.checkAccess(entityClasses, uri, method);

  this.get = (uri, callback) => request.get(this, entityClasses, uri, callback);
  this.head = (uri, callback) => request.head(uri, callback);
  this.post = (uri, content, callback) => request.post(entityClasses, uri, content, callback);
  this.patch = (uri, content, callback) => request.patch(entityClasses, uri, content, callback);
  this.put = (uri, content, callback) => request.put(entityClasses, uri, content, callback);
  this.delete = (uri, callback) => request.delete(entityClasses, uri, callback);
}

const xyz = new XYZ();
/**
 * Create a ui component or display.
 * @param  {[Object]} options The options for the ui component
 * @param  {[Element]} WRAPPER  The DOM element in which to create the ui component
 * @returns {Element}         Returns the (created) DOM element.
 */
exports.ui = (options, WRAPPER = null) => xyz.ui(options, WRAPPER);
/**
 * Create an event listener
 * @param  {string}   uri       TODO
 * @param  {string}   eventName TODO
 * @param  {Function} callback  TODO
 * @returns {Array}             An array containing the attached listeners
 */
exports.on = (uri, eventName, callback) => xyz.on(uri, eventName, callback);
/**
 * TODO
 * @param {[type]} queryParameterName TODO
 * @param {[type]} value              TODO
 * @returns {void}
 */
exports.setQueryParameter = (queryParameterName, value) => web.setQueryParameter(queryParameterName, value);
/**
 * TODO
 * @param {[type]} queryParameterName TODO
 * @returns {void}
 */
exports.getQueryParameter = queryParameterName => web.getQueryParameter(queryParameterName);
/**
 * TODO
* @returns {Object}        TODO
*/
exports.getQueryParameters = () => web.getQueryParameters();
/**
 * TODO
* @returns {Object}        TODO
*/
exports.getQueryFilters = () => web.getQueryFilters();
/**
 * TODO
 * @param  {[type]}   variableNameEventName TODO 'myVariable:change'   'myVariable:create' 'myVariable:clear'
 * @param  {Function} callback              (value,variableName)=>{...}
 * @returns {void}                         TODO
 */
exports.onVariable = (variableNameEventName, callback) => variables.onVariable(variableNameEventName, callback);
/**
 * TODO
 * @param {string} variableName TODO
 * @returns {bool}  TODO
 */
exports.hasVariable = variableName => variables.hasVariable(variableName);
/**
 * TODO
 * @param {string} variableName TODO
 * @returns {string}  TODO
 */
exports.getVariable = variableName => variables.getVariable(variableName);
/**
 * Get all variables as an object with key:value pairs
 * @returns {Object}  TODO
 */
exports.getVariables = () => variables.getVariables();
/**
 * TODO
 * @param {[type]} variableName TODO
 * @param {[type]} value TODO
 * @returns {void}
 */
exports.setVariable = (variableName, value) => variables.setVariable(variableName, value);
/**
 * TODO
 * @param {Object} values TODO
 * @returns {void}
 */
exports.setVariables = values => variables.setVariables(values);
/**
 * TODO
 * @param {[type]} queryParameterName TODO
 * @returns {void}
 */
exports.clearVariable = queryParameterName => variables.clearVariable(queryParameterName);
