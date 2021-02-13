const types = require('../../build/types.js');
const response = require('../entity/response.js');
const json = require('../web/json.js');
const render = require('./render');
const DEFAULT_ACTION = 'view';
// onChange = (content, [additionalSubPropertyPath]) => {...}
// onDelete = (content, [additionalSubPropertyPath]) => {...}

function Item (xyz, baseUri, subPropertyPath, status, content, settings, options, onChange, onDelete, creatorData) {
  const callbacks = [];
  /**
   * Get the uri for the current entity
   * @returns {string} uri
   */
  this.getUri = () => baseUri;
  /**
   * [getStatus description]
   * @returns {TODO} TODO
   */
  this.getStatus = () => status;
  /**
   * [getContent description]
   * @returns {TODO} TODO
   */
  this.getContent = () => content;
  /**
   * [getOptions description]
   * @returns {TODO} TODO
   */
  this.getOptions = () => options;
  /**
   * [getAction description]
   * @returns {TODO} TODO
   */
  this.getAction = () => options.hasOwnProperty('action') ? options.action : DEFAULT_ACTION;
  /**
   * [getOption description]
   * @param  {TODO} optionName TODO
   * @returns {TODO}            TODO
   */
  this.getOption = optionName => options[optionName];
  /**
   * [hasOption description]
   * @param  {TODO}  optionName TODO
   * @returns {Boolean}            TODO
   */
  this.hasOption = optionName => options.hasOwnProperty(optionName);
  /**
   * [getSettings description]
   * @returns {TODO} TODO
   */
  this.getSettings = () => settings;
  /**
   * [getSetting description]
   * @param  {TODO} settingNames TODO
   * @returns {TODO}              TODO
   */
  this.getSetting = (...settingNames) => {
    let iterator = settings;
    for (const settingName of settingNames) {
      if (
        typeof iterator !== 'object' ||
          iterator === null ||
          ((iterator instanceof Array) && (isNaN(settingName) || settingName < 0 || settingName >= iterator.length)) ||
          (!(iterator instanceof Array) && !iterator.hasOwnProperty(settingName))
      ) return undefined;
      iterator = iterator[settingName];
    }
    return iterator;
  };
  /**
 * [hasSetting description]
 * @param  {TODO}  settingNames TODO
 * @returns {Boolean}              TODO
 */
  this.hasSetting = (...settingNames) => {
    let iterator = settings;
    for (const settingName of settingNames) {
      if (
        typeof iterator !== 'object' ||
          iterator === null ||
          ((iterator instanceof Array) && (isNaN(settingName) || settingName < 0 || settingName >= iterator.length)) ||
          (!(iterator instanceof Array) && !iterator.hasOwnProperty(settingName))
      ) return false;
      iterator = iterator[settingName];
    }
    return true;
  };
  /**
   * [patch description]
   * @param  {TODO} newContent                [TODO]
   * @param  {TODO} additionalSubPropertyPath [TODO]
   * @returns {TODO}                           [TODO]
   */
  this.patch = (newContent, additionalSubPropertyPath) => {
    additionalSubPropertyPath = additionalSubPropertyPath || [];

    const data = json.set({}, additionalSubPropertyPath, newContent);
    // TODO these callbacks are done without validation
    const node = new response.Node({}, '?', 200, data, [], 'PATCH'); // not defining object and entityId
    for (const callback of callbacks) {
      callback(node);
    }
    // note: adding the subPropertyPath and additionalSubPropertyPath is handled by the onChange function
    (options.onChange || onChange)(newContent, additionalSubPropertyPath);
  };
  /**
 * [delete description]
 * @param  {TODO} subPropertyPath TODO
 * @returns {TODO}                 TODO
 */
  this.delete = subPropertyPath => {
    // TODO call callbacks
    /*
    verify:
    const node = new response.Node({}, '?', 200, null, [], 'DELETE'); // not defining object and entityId
    for (const callback of callbacks) {
      callback(node);
    }
    */
    // TODO these callbacks are done without validation
    (options.onDelete || onDelete)(subPropertyPath);
  };
  /**
   * [renderSubElement description]
   * @param  {TODO} action                    TODO
   * @param  {TODO} additionalSubPropertyPath TODO
   * @param  {TODO} status                    TODO
   * @param  {TODO} content                   TODO
   * @param  {TODO} settings                  TODO
   * @param  {TODO} options_                  TODO
   * @returns {TODO}                           TODO
   */
  this.renderSubElement = (action, additionalSubPropertyPath, status, content, settings, options_) => {
    if (options.display === 'create') {
      const TABLE = document.createElement('TABLE');
      TABLE.style.display = 'inline-block';
      try {
        json.set(creatorData, subPropertyPath.concat(additionalSubPropertyPath), content);
      } catch (e) {
        console.error('Item.renderSubElement json.set failed', e);
      }
      const TRs = render.creator(xyz, options_, baseUri, settings, subPropertyPath.concat(additionalSubPropertyPath), creatorData);
      for (const TR of TRs) {
        TABLE.appendChild(TR);
      }
      return TABLE;
    } else {
      return render.element(xyz, action, baseUri, subPropertyPath.concat(additionalSubPropertyPath), status, content, settings, options_);
    }
  };
  /**
   * [renderCreator description]
   * @param  {TODO} options         TODO
   * @param  {TODO} uri             TODO
   * @param  {TODO} settings        TODO
   * @param  {TODO} subPropertyPath TODO
   * @param  {TODO} newCreatorData  TODO
   * @param  {TODO} INPUT_submit    TODO
   * @param  {TODO} displayMessage  TODO
   * @returns {TODO}                 TODO
   */
  this.renderCreator = (options, uri, settings, subPropertyPath, newCreatorData, INPUT_submit, displayMessage) => render.creator(xyz, options, uri, settings, subPropertyPath, newCreatorData, INPUT_submit, displayMessage);

  this.ui = xyz.ui; // TODO check if can be removed?

  // callback = (status,content)=>{...}
  /**
   * [onChange description]
   * @param  {Function} callback TODO
   * @returns {void}            TODO
   */
  this.onChange = callback => {
    if (typeof callback !== 'function') throw new TypeError('callback is not a function.');

    callbacks.push(callback);
    if (options.display !== 'create') {
      const fullUri = subPropertyPath.length > 0
        ? baseUri + '/' + subPropertyPath.join('/')
        : baseUri;
      xyz.on(fullUri, 'changed', (entityClass, entityId, node, eventName) => callback(node));
      // TODO unregister these listeners somehow
    }
  };
  /**
   * [validateContent description]
   * @param  {Mixed} content_  TODO
   * @param  {Object} settings_ TODO
   * @returns {bool}           TODO
   */
  this.validateContent = (content_, settings_) => {
    content_ = typeof content_ === 'undefined' ? content : content_;
    settings_ = typeof settings_ === 'object' ? settings_ : settings;
    const typeName = settings_.type || 'string';
    if (!types.hasOwnProperty(typeName)) return false;
    if (!types[typeName].hasOwnProperty('validateContent')) return false;
    const item = new Item(xyz, baseUri, subPropertyPath, status, content_, settings_, options);
    return types[typeName].validateContent(item);
  };
  /**
   * [select description]
   * @param  {string} entityClassName TODO
   * @param  {string} entityId        TODO
   * @returns {void}                 TODO
   */
  this.select = (entityClassName, entityId) => xyz.select(entityClassName, entityId, this.getOption('select'), this.getOption('selectUri'));
}

exports.constructor = Item;
