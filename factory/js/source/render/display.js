const displays = require('../../build/displays');
const uriTools = require('../uri/uri.js');
const response = require('../entity/response.js');
const variables = require('../variables/variables.js');

const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';

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

function DisplayParameters (xyz, action, options, WRAPPER, entityClassName, entityId, node, uri) {
  /**
   * Get the uri for the current entity
   * @returns {string} uri
   */
  this.getRequestUri = () => uri;
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
  this.onVariable = (variableName, callback) => xyz.onVariable(variableName, callback);
  /**
   * [getDisplayName description]
   * @param  {Array} propertyPath TODO
   * @return {string}              TODO
   */

  this.getDisplayName = propertyPath => xyz.getDisplayName(entityClassName, propertyPath);
  /**
   * [getPropertyPath description]
   * @returns {Array} TODO
   */
  this.getPropertyPath = () => {
    const path = uriTools.pathFromUri(uri);
    return path.slice(2);
  };

  /**
   * @returns {string} The title of current entity. Defaults to the entityId is title is not defined;
   */
  this.getTitle = () => {
    const fallback = '/' + entityClassName + '/' + entityId;
    const titlePropertyPath = xyz.getTitlePropertyPath(entityClassName);
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
    if (this.hasOption('select')) xyz.onVariable(this.getOption('select'), callback);
  };
  /**
   * [onSelect description]
   * @param  {Function} callback TODO
   * @returns {void}            TODO
   */
  this.onMultiSelect = callback => {
    if (this.hasOption('multiSelect')) xyz.onVariable(this.getOption('multiSelect'), callback);
  };
  /**
   * [select description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.select = (entityClassName_ = entityClassName, entityId_ = entityId) => {
    xyz.select(entityClassName_, entityId_, this.getOption('select'), this.getOption('selectUri'));
    if (this.hasOption('onChange')) {
      const onChange = this.getOption('onChange');
      if (typeof onChange === 'function') onChange();
      else if (typeof onChange === 'string') eval(onChange);
    }
  };
  /**
   * [select description]
   * @returns {void}                 TODO
   */
  this.selectAll = () => this.select('*', '*');
  /**
   * [select description]
   * @returns {void}                 TODO
   */
  this.selectNone = () => this.select(undefined, undefined);
  /**
   * [isSelected description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {Boolean}                 TODO
   */
  this.isSelected = (entityClassName_ = entityClassName, entityId_ = entityId) => xyz.isSelected(entityClassName_, entityId_, this.getOption('select'));
  /**
   * [multiSelectAdd description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.multiSelectAdd = (entityClassName_ = entityClassName, entityId_ = entityId) => xyz.selectAdd(entityClassName_, entityId_, this.getOption('multiSelect'), this.getOption('multiSelectUri'));
  /**
   * [multiSelectRemove description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {void}                 TODO
   */
  this.multiSelectRemove = (entityClassName_ = entityClassName, entityId_ = entityId) => xyz.selectRemove(entityClassName_, entityId_, this.getOption('multiSelect'));
  /**
   * [multiSelectNone description]
   * @returns {void} TODO
   */
  this.multiSelectAll = () => xyz.select('*', '*', this.getOption('multiSelect'));
  /**
   * [multiSelectNone description]
   * @returns {void} TODO
   */
  this.multiSelectNone = () => xyz.select(undefined, undefined, this.getOption('multiSelect'));
  // TODO multiSelectAll  ('*')
  /**
   * [isMultiSelected description]
   * @param  {string} [entityClassName_] TODO
   * @param  {string} [entityId_]        TODO
   * @returns {Boolean}                 TODO
   */
  this.isMultiSelected = (entityClassName_, entityId_) => xyz.isSelected(entityClassName_ || entityClassName, entityId_ || entityId, this.getOption('multiSelect'));
  /**
   * [showCreateButton description]
   * @returns {void} TODO
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
   * [renderEntity description]
   * @returns {Element} TODO
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

  this.xyz = xyz; // TODO encapsulate
}

const displayListenersPerWrapper = new Map();

const uiElementWaitingForData = (display, displayParameters) => {
  const WRAPPER = displayParameters.getWRAPPER();
  WRAPPER.classList.add('xyz-waiting-for-data');
  if (display && display.hasOwnProperty('waitingForData')) { display.waitingForData(displayParameters); } else { WRAPPER.innerHTML = 'Waiting for user data...'; }
};

const uiElementWaitingForInput = (display, displayParameters) => {
  const WRAPPER = displayParameters.getWRAPPER();
  WRAPPER.classList.add('xyz-waiting-for-input');
  if (display && display.hasOwnProperty('waitingForInput')) { display.waitingForInput(displayParameters); } else { WRAPPER.innerHTML = 'Waiting for user input...'; }
};

const uiElementEmpty = (display, displayParameters) => {
  const WRAPPER = displayParameters.getWRAPPER();
  WRAPPER.classList.remove('xyz-waiting-for-input');
  WRAPPER.classList.add('xyz-empty');
  if (display && display.hasOwnProperty('empty')) { display.empty(displayParameters); } else { WRAPPER.innerHTML = 'Empty'; }
};

const uiElementFirst = (display, displayParameters) => {
  const WRAPPER = displayParameters.getWRAPPER();
  if (WRAPPER.classList.contains('xyz-empty')) {
    WRAPPER.classList.remove('xyz-empty');
    if (display && display.hasOwnProperty('first')) { display.first(displayParameters); } else { WRAPPER.innerHTML = ''; }
  }
};

const uiElementEntity = (display, displayParameters) => {
  if (display && display.hasOwnProperty('entity')) { display.entity(displayParameters); } else {
    // TODO a default way of handeling stuff
  }
};

const uiElementRemove = (display, displayParameters) => {
  if (display && display.hasOwnProperty('remove')) { display.remove(displayParameters); } else {
    // TODO a default way of handeling stuff
  }
};

const renderDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName) => {
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const path = uriTools.pathFromUri(uri);
  node = response.filter(node, path.slice(2)); // filter the content that was not requested
  const displayParameters = new DisplayParameters(xyz, action, options, WRAPPER, entityClassName, entityId, node, uri);
  uiElementFirst(display, displayParameters);
  uiElementEntity(display, displayParameters);
};

const removeDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName) => {
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const displayParameters = new DisplayParameters(xyz, action, options, WRAPPER, entityClassName, entityId, node, uri);
  uiElementRemove(display, displayParameters);
};

const addListeners = (xyz, uri, options, WRAPPER) => {
  if (displayListenersPerWrapper.has(WRAPPER)) {
    const listeners = displayListenersPerWrapper.get(WRAPPER);
    listeners.forEach(listener => listener.stop());
  }
  // FIXME dirty way of cleaning up all listeners by garbage collection
  // the problems lies with ui elements created by references,
  // those are drawn and then redraw with different wrappers when the base is updated
  //   e.g. BASE_WRAPPER->REF_WRAPPER1 ->  BASE_WRAPPER->REF_WRAPPER2
  //  BASE_WRAPPER is handled okay by the displayListenersPerWrapper.has(WRAPPER) above
  // but REF_WRAPPER1  not

  displayListenersPerWrapper.forEach((listeners, WRAPPER) => {
    if (!document.body.contains(WRAPPER)) {
      listeners.forEach(listener => listener.stop());
      displayListenersPerWrapper.delete(WRAPPER);
    }
  });
  const baseUri = uriTools.getBaseUri(uri);
  const createdListeners = xyz.on(baseUri, 'created', renderDisplay(xyz, uri, options, WRAPPER));
  const removedListeners = xyz.on(baseUri, 'removed', removeDisplay(xyz, uri, options, WRAPPER));

  displayListenersPerWrapper.set(WRAPPER, [...createdListeners, ...removedListeners]);
};

const renderUiElement = (xyz, options, WRAPPER) => {
  const {uri, aggregations} = uriTools.parseAggregationFromUri(options.uri);

  options.uri = uri;
  options.aggregations = aggregations;

  const displayName = options.display || DEFAULT_DISPLAYNAME;
  if (!displays.hasOwnProperty(displayName)) throw new Error('Unrecognized displayName.');

  const display = displays[displayName]; // TODO check?
  const action = options.action || DEFAULT_ACTION;

  const path = uriTools.pathFromUri(uri);
  const entityId = path[1] || '*';
  const entityClass = path[0];
  const displayParameters = new DisplayParameters(xyz, action, options, WRAPPER, entityClass, entityId, null, uri);

  uiElementWaitingForData(display, displayParameters);

  variables.registerUri(xyz, uri, uri => {
    // TODO this can be called multiple times on variable changes,
    uiElementEmpty(display, displayParameters);
    xyz.get(uri, node => { // TODO this should be handled by having an available instead of created listener
      WRAPPER.classList.remove('xyz-waiting-for-data');

      for (const entityClassName in node) {
        for (const entityId in node[entityClassName]) {
          renderDisplay(xyz, uri, options, WRAPPER)(entityClassName, entityId, node[entityClassName][entityId]);
        }
      }

      addListeners(xyz, uri, options, WRAPPER);
    });
  },
  () => uiElementWaitingForInput(display, displayParameters),
  options.dynamic
  );
};

exports.renderUiElement = renderUiElement;
