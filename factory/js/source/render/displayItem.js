const uriTools = require('../uri/uri.js');
const response = require('../entity/response.js');
const variables = require('../variables/variables.js');

let DIV_tmpColor;

// string to int
const hashCode = string => string.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
const colors = ['red', 'green', 'blue', 'yellow', 'pink', 'cyan', 'orange', 'purple'];
const getColor = string => {
  if (isNaN(string)) { // integers are colors, we don't want that
    if (!DIV_tmpColor) DIV_tmpColor = document.createElement('DIV');
    DIV_tmpColor.style.color = string; // this only works if it's a valid css color
    if (DIV_tmpColor.style.color) return DIV_tmpColor.style.color;
  }
  return colors[Math.abs(hashCode(string)) % colors.length];
};

function flatten2 (source, target, prefix) {
  if (source.constructor !== Object) return;
  for (const key in source) {
    const value = source[key];
    if (value.constructor === Object) { flatten2(value, target, prefix + key + '.'); } else { target[prefix + key] = value; }
  }
}

function flatten (source) {
  if (source.constructor !== Object) return source;
  const target = {};
  flatten2(source, target, '');
  return target;
}

exports.DisplayItem = function DisplayItem (xyz, action, options, WRAPPER, entityClassName, entityId, node, requestUri, requestId) {
  /**
   * Whether this is part of a multi request
   * @returns {bool} Whether this is part of a multi request
   */
  this.isMultiRequest = () => typeof requestId === 'number';
  /**
   * Get the request id for the current entity
   * @returns {string} uri
   */
  this.getRequestId = () => requestId;
  /**
   * Get the uri for the current entity
   * @returns {string} uri
   */
  this.getRequestUri = () => requestUri;
  /**
   * Get the action for the display.
   * @returns {string} action 'edit' or 'view'
   */
  this.getAction = () => action;
  /**
   * @param {string} optionName The name of the option
   * @returns {bool}            Whether the display has a given option defined.
   */
  this.hasOption = optionName => options.hasOwnProperty(optionName);
  /**
   * @returns {Object} All options as an object.
   */
  this.getOptions = () => options;
  /**
   * @param {string} optionName The name of the option
   * @returns {Mixed}            The value of the requested option.
   */
  this.getOption = optionName => options[optionName];
  /**
   * [getSubOptions description]
   * @param  {string} propertyName TODO
   * @returns {Object}              TODO
   */
  this.getSubOptions = propertyName => {
    return options.hasOwnProperty('subOptions') && options.subOptions.hasOwnProperty(propertyName)
      ? options.subOptions[propertyName]
      : options;
  };
  /**
   * [getWRAPPER description]
   * @returns {Element} TODO
   */
  this.getWRAPPER = () => WRAPPER;
  /**
   * [getEntityClassName description]
   * @returns {string} TODO
   */
  this.getEntityClassName = () => entityClassName;
  /**
   * [getEntityId description]
   * @returns {string} TODO
   */
  this.getEntityId = () => entityId;
  /**
   * [getNode description]
   * @param  {string|Array} propertyPathOrString TODO
   * @returns {Object|TypeItem}                         TODO
   */
  this.getNode = propertyPathOrString => {
    const filteredNode = response.filter(node, this.getPropertyPath());
    if (typeof propertyPathOrString === 'undefined') return filteredNode;
    if (typeof propertyPathOrString === 'string') return response.getSubNode(filteredNode, [propertyPathOrString]);
    if (propertyPathOrString instanceof Array) return response.getSubNode(filteredNode, propertyPathOrString);
    throw new Error('Illegal propertyPath or propertyName');
  };
  /**
   * [getNode description]
   * @param  {string|Array} propertyPathOrString TODO
   * @returns {bool}                         TODO
   */
  this.hasNode = propertyPathOrString => {
    return !!this.getNode(propertyPathOrString);
    /* TODO
    const filteredNode = response.filter(node, this.getPropertyPath());
    if (typeof propertyPathOrString === 'string') return response.getSubNode(filteredNode, [propertyPathOrString]);
    if (propertyPathOrString instanceof Array) return response.getSubNode(filteredNode, propertyPathOrString);
    throw new Error('Illegal propertyPath or propertyName'); */
  };
  /**
   * [getFlatNodes description]
   * @returns {Object} TODO
   */
  this.getFlatNodes = () => flatten(this.getNode());
  /**
   * [onVariable description]
   * @param  {string}   variableName TODO
   * @param  {Function} callback     TODO
   * @returns {void}                TODO
   */
  this.onVariable = (variableName, callback) => variables.onVariable(variableName, callback);
  /**
   * [getDisplayName description]
   * @param  {Array} propertyPath TODO
   * @return {string}              TODO
   */

  this.getDisplayName = propertyPath => {
    if (typeof propertyPath === 'string')propertyPath = [propertyPath];
    const labels = this.getOption('labels');
    if (labels && labels.hasOwnProperty(propertyPath[0])) return labels[propertyPath[0]];
    else return xyz.getDisplayName(entityClassName, propertyPath);
  };
  /**
   * [getPropertyPath description]
   * @returns {Array} TODO
   */
  this.getPropertyPath = () => {
    const path = uriTools.pathFromUri(requestUri);
    return path.slice(2);
  };

  /**
   * @returns {string} The title of current entity. Defaults to the entityId is title is not defined;
   */
  this.getTitle = () => {
    const fallback = '/' + entityClassName + '/' + entityId;
    const titlePropertyPath = this.getTitlePropertyPath(entityClassName);
    if (titlePropertyPath === null) return fallback;
    const titleResponse = response.getSubNode(node, titlePropertyPath);
    if (!titleResponse || titleResponse.hasErrors()) return fallback;
    const titleContent = titleResponse.getContent();

    return typeof titleContent === 'undefined' ? fallback : titleContent;
  };
  /**
   * @param  {[string]} string TODO
   * @returns {string} The color associated with the content.
   */
  this.getColor = string => {
    if (typeof string === 'string') {
      // nothing to do
    } else if (this.hasOption('color')) {
      const colorPropertyName = this.getOption('color');
      if (!this.hasNode(colorPropertyName)) return 'black';
      string = this.getNode(colorPropertyName).getContent();// TODO check
      if (typeof string === 'number') string = string.toString();
    } else string = entityClassName + '/' + entityId;
    if (typeof string !== 'string') return 'black'; // can't make heads or tails of this, just return black
    return getColor(string);
  };
  /**
   * [onSelect description]
   * @param  {Function} callback TODO
   * @returns {void}            TODO
   */
  this.onSelect = callback => {
    if (this.hasOption('select')) variables.onVariable(this.getOption('select'), callback);
  };
  /**
   * [onSelect description]
   * @param  {Function} callback TODO
   * @returns {void}            TODO
   */
  this.onMultiSelect = callback => {
    if (this.hasOption('multiSelect')) variables.onVariable(this.getOption('multiSelect'), callback);
  };
  const select = (entityClassName_, entityId_) => {
    variables.select(entityClassName_, entityId_, this.getOption('select'), this.getOption('selectUri'));
    if (this.hasOption('onChange')) {
      const onChange = this.getOption('onChange');
      if (typeof onChange === 'function') onChange();
      else if (typeof onChange === 'string') eval(onChange);
    }
  };
  /**
   * [select description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.select = (entityClassName_ = entityClassName, entityId_ = entityId) => select(entityClassName_, entityId_);
  /**
   * [select description]
   * @returns {void}                 TODO
   */
  this.selectAll = () => this.select('*', '*');
  /**
   * [select description]
   * @returns {void}                 TODO
   */
  this.selectNone = () => select(undefined, undefined);// prevent parameter defaults
  /**
   * [isSelected description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {Boolean}                 TODO
   */
  this.isSelected = (entityClassName_ = entityClassName, entityId_ = entityId) => variables.isSelected(entityClassName_, entityId_, this.getOption('select'));
  /**
   * [multiSelectAdd description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.multiSelectAdd = (entityClassName_ = entityClassName, entityId_ = entityId) => variables.selectAdd(entityClassName_, entityId_, this.getOption('multiSelect'), this.getOption('multiSelectUri'));
  /**
   * [multiSelectRemove description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.multiSelectRemove = (entityClassName_ = entityClassName, entityId_ = entityId) => {
    return variables.selectRemove(entityClassName_, entityId_, this.getOption('multiSelect'), WRAPPER.entityIds);
  };
  /**
   * [multiSelectNone description]
   * @returns {void} TODO
   */
  /**
    * [multiSelectToggle description]
    * @param  {string} [entityClassName_] TODO
    * @param  {string} [entityId_]        TODO
    * @returns {void}                 TODO
    */
  this.multiSelectToggle = (entityClassName_ = entityClassName, entityId_ = entityId) => {
    if (this.isMultiSelected(entityClassName_, entityId_)) variables.selectRemove(entityClassName_, entityId_, this.getOption('multiSelect'), WRAPPER.entityIds);
    else variables.selectAdd(entityClassName_, entityId_, this.getOption('multiSelect'));
  };
  /**
    * [multiSelectNone description]
    * @returns {void} TODO
    */
  this.multiSelectAll = () => variables.select('*', '*', this.getOption('multiSelect'));
  /**
   * Include all items in the multi selection. This sets the multi select variable to '*'.
   * @returns {void} TODO
   */
  this.multiSelectNone = () => variables.select(undefined, undefined, this.getOption('multiSelect'));
  /**
   * Clear the multi selection if multiSelect option is defined. This clears the multi select variable.
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {Boolean}                 TODO
   */
  this.isMultiSelected = (entityClassName_, entityId_) =>
    variables.isSelected(entityClassName_ || entityClassName, entityId_ || entityId, this.getOption('multiSelect')) ||
    variables.isSelected(entityClassName_ || entityClassName, '*', this.getOption('multiSelect'));
  /**
   * Whether to show an interface to create new entity
   * @returns {void}
   */
  this.showCreateButton = () => {
    // TODO only if has the permissions to add
    if (this.getOption('showCreateButton') !== false) {
      const INPUT = document.createElement('INPUT');
      INPUT.type = 'submit';
      // TODO add class
      INPUT.value = this.getOption('createButtonText') || '+';
      INPUT.onclick = () => {
        if (DIV.style.display === 'none') {
          DIV.style.display = 'block';
          INPUT.value = '-';
        } else {
          INPUT.value = this.getOption('createButtonText') || '+';
          DIV.style.display = 'none';
        }
      };

      xyz.on(this.getRequestUri(), 'access:put', access => { // detect access changes
        INPUT.disabled = !access;
      });

      const WRAPPER = this.getWRAPPER();
      WRAPPER.appendChild(INPUT);
      const DIV = document.createElement('DIV');
      DIV.style.display = 'none';
      const entityClassName = this.getEntityClassName();
      xyz.ui({uri: '/' + entityClassName, display: 'create'}, DIV);
      WRAPPER.appendChild(DIV);
      return DIV;
    } else return null;
  };
  /**
   * Render the entity passed in the display.
   * @returns {Element} The DOM element containing the rendered entity;
   */
  this.renderEntity = () => {
    const flatContent = this.getFlatNodes(); // TODO
    if (flatContent.constructor !== Object) { return flatContent.render(this.getAction(), this.getOptions()); } else {
      const DIV = document.createElement('DIV');
      for (const propertyName in flatContent) {
        const DIV_property = flatContent[propertyName].render(this.getAction(), this.getSubOptions(propertyName));
        DIV.appendChild(DIV_property);
      }
      return DIV;
    }
  };
  /**
   * Show little gear button that opens the ui element in the /ui editor
   * @returns {Element} Returns the button DOM element.
   */
  this.showUiEditButton = () => {
    const BUTTON_gear = document.createElement('BUTTON');
    BUTTON_gear.className = 'xyz-ui-edit';
    BUTTON_gear.title = 'Open element in ui editor.';
    BUTTON_gear.onclick = () => {
      const options = this.getOptions();
      let uri = options.uri.split('?')[0];
      let queryString = options.uri.split('?')[1] || ''; // TODO handle multirequest
      const path = uri.substr(1).split('/');
      const entityClassName = path[0];
      const entityIdList = path[1] || '*';
      let properties = path[2] || '*';
      const subPropertyPath = path.slice(3);
      for (const optionName in options) {
        if (optionName === 'aggregations') {
          for (const [aggregation, ...propertyNames] of options.aggregations) {
            const aggregationString = aggregation + '(' + propertyNames.join(',') + ')';
            if (properties === '*') properties = aggregationString;
            else properties += ',' + aggregationString;
          }
        } else if (!['uri', 'labels'].includes(optionName)) {
          queryString += (queryString === '' ? '' : '&') + encodeURIComponent(optionName) + '=' + encodeURIComponent(options[optionName]);
        }
      }
      uri = '/' + entityClassName + '/' + entityIdList;
      if (path.length > 2) {
        uri += '/' + properties;
        if (path.length > 3) uri += '/' + subPropertyPath.join('/');
      }

      const vars = variables.getVariables(); // TODO only vars that are used by uri and innerHTML?
      for (const variableName in vars) {
        queryString += (queryString === '' ? '' : '&') + encodeURIComponent(variableName) + '=' + encodeURIComponent(vars[variableName]);
      }
      const win = window.open('/ui' + uri + '?' + queryString, '_blank');
      win.focus();
    };
    this.getWRAPPER().appendChild(BUTTON_gear);
    return BUTTON_gear;
  };

  this.done = () => {
    // TODO
  };
  // TODO docs
  this.onVariable = (variableName, callback) => variables.onVariable(variableName, callback);
  this.setVariable = (variableName, value) => variables.setVariable(variableName, value);
  this.hasVariable = variableName => variables.hasVariable(variableName);
  this.getVariable = variableName => variables.getVariable(variableName);
  this.clearVariable = variableName => variables.clearVariable(variableName);
  this.getTitlePropertyPath = (entityClassName_ = entityClassName) => xyz.getTitlePropertyPath(entityClassName_);
  this.xyz = xyz; // TODO encapsulate
};
