const types = require('../../build/types.js');
const listener = require('./listener.js');
const response = require('./response.js');
const render = require('../render/render.js');
const input = require('../request/input.js');
const accessVerbsToMethods = require('../../../../engine/const/constants.json').accessVerbsToMethods;

const validateSubPropertyPath = (types) => (type, subPropertyPath) => {
  if (!types.hasOwnProperty(type)) return false;
  if (typeof types[type].validateSubPropertyPath !== 'function') return false;
  return types[type].validateSubPropertyPath(subPropertyPath);
};

exports.constructor = function Property (xyz, parent, propertyName, settings) {
  listener.Handler.call(this);

  const subProperties = {};
  const contents = {};
  const errors = {};// TODO
  const statusses = {};// TODO

  const type = settings.type;
  // TODO handle type alliasses?

  const isPrimitive = !settings.hasOwnProperty('signature') && type !== 'reference';
  if (!isPrimitive) {
    if (type === 'reference') {
      const referenceEntityClassName = settings.uri.split('/')[1];// TODO check
      const meta = xyz.getMeta(referenceEntityClassName);
      for (const subPropertyName in meta) {
        subProperties[subPropertyName] = new Property(xyz, this, subPropertyName, meta[subPropertyName]);
      }
    } else {
      for (const subPropertyName in settings.signature) {
        subProperties[subPropertyName] = new Property(xyz, this, subPropertyName, settings.signature[subPropertyName]);
      }
    }
  }
  this.getStatus = entityId => {
    if (isPrimitive || (type === 'reference' && contents.hasOwnProperty(entityId))) return statusses[entityId];
    let status;
    for (const subPropertyName in subProperties) {
      const subStatus = subProperties[subPropertyName].getStatus(entityId);
      if (typeof status === 'undefined') {
        status = subStatus;
      } else if (status !== subStatus) {
        return 207;
      }
    }
    return status;
  };

  this.getContent = entityId => {
    if (isPrimitive || (type === 'reference' && contents.hasOwnProperty(entityId))) return contents[entityId];
    const content = {};
    for (const subPropertyName in subProperties) {
      content[subPropertyName] = subProperties[subPropertyName].getContent(entityId);
    }
    return content;
  };

  this.hasSetting = settingName => settings.hasOwnProperty(settingName);
  this.getSetting = settingName => settings[settingName];
  this.getSettings = () => settings;

  this.getUri = entityId => parent.getUri(entityId) + '/' + propertyName;

  this.getPath = entityId => [...parent.getPath(entityId), propertyName];
  this.getPropertyPath = () => this.getPath('*').slice(2);
  this.getSubUri = () => this.getPath('*').slice(2).join('/');

  this.getEntityClassName = () => parent.getEntityClassName();

  this.getParent = () => parent;

  this.getResponse = (path, entityId, method) => {
    if (isPrimitive || (type === 'reference' && path.length === 0)) {
      return new response.Node(this, entityId, this.getStatus(entityId), this.getContent(entityId), errors[entityId], method);
    } else {
      const subPropertyNames = (path.length === 0 || path[0] === '*')
        ? Object.keys(subProperties)
        : path[0].split(',');
      const content = {};
      const subPath = path.slice(1);
      for (const subPropertyName of subPropertyNames) {
        content[subPropertyName] = subProperties.hasOwnProperty(subPropertyName)
          ? subProperties[subPropertyName].getResponse(subPath, entityId, method)
          : content[subPropertyName] = new response.Node(this, entityId, 400, null, [`${subPropertyName} does not exist.`], method); // TODO
      }
      return content;
    }
  };

  this.callListeners = (state, entityId) => {
    const propertyPath = this.getPropertyPath();
    for (let depth = propertyPath.length - 1; depth >= 0; --depth) { // call all depths of the property path
      this.callAtomicListeners(state, entityId, this.getResponse([], entityId, state.getMethod()));
    }
    parent.callListeners(state.getParentState(), entityId);
  };

  this.handleInput = (...args) => {
    return isPrimitive || (type === 'reference' && args[0].length === 0)
      ? input.handlePrimitive(this, contents, statusses)(...args)
      : input.handle(this, statusses, subProperties, null)(...args);
  };

  this.addPropertyListener = (entityId, subPropertyPath, eventName, callback) => {
    const listeners = [];
    if (subPropertyPath.length === 0) {
      const listener = this.addAtomicListener(entityId, eventName, callback, '', contents);
      listeners.push(listener);
    } else if (isPrimitive) {
      if (types.hasOwnProperty(type) && types[type].hasOwnProperty('validateSubPropertyPath')) {
        if (types[type].validateSubPropertyPath(subPropertyPath, settings, validateSubPropertyPath)) {
          const subUri = subPropertyPath.join('/');
          const listener = this.addAtomicListener(entityId, eventName, callback, subUri, contents);
          listeners.push(listener);
        } else {
          console.error('Invalid sub property path: ' + this.getUri(entityId) + '/' + subPropertyPath.join('/') + ' for type ' + type + '.');
        }
      } else {
        console.error('Invalid sub property path: ' + this.getUri(entityId) + subPropertyPath.join('/') + ' for type ' + type + '.');
      }
    } else {
      const subPropertNameList = subPropertyPath[0];
      const subPropertyNames = subPropertNameList === '*'
        ? Object.keys(subProperties)
        : subPropertNameList.split(',');
      const subPath = subPropertyPath.slice(1);
      for (const subPropertyName of subPropertyNames) {
        if (subProperties.hasOwnProperty(subPropertyName)) {
          const subPropertyListeners = subProperties[subPropertyName].addPropertyListener(entityId, subPath, eventName, callback);
          listeners.push(...subPropertyListeners);
        } else {
          // TODO throw error?
          console.error(subPropertyName + 'not available');
        }
      }
    }
    return listeners;
  };

  this.getSubObject = subPropertyName => subProperties[subPropertyName];

  this.createCreator = (options, data, INPUT_submit, displayMessage) => {
    const TRs = [];
    if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
      if (settings.auto) return [];
      const uri = this.getUri('$new');
      return render.creator(xyz, options, uri, settings, [propertyName], data, INPUT_submit, displayMessage);
    } else if (!isPrimitive) {
      for (const propertyName in subProperties) {
        data[propertyName] = {};
        TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName], INPUT_submit, displayMessage));
      }
    } else {
      console.error('No available rendering method for edit ' + type);
    }
    return TRs;
  };

  this.getTitlePropertyPath = () => {
    if (isPrimitive) {
      return settings.title === true ? [] : null;
    } else {
      for (const subPropertyName in subProperties) {
        const titlePropertyPath = subProperties[subPropertyName].getTitlePropertyPath();
        if (titlePropertyPath !== null) return [subPropertyName].concat(titlePropertyPath);
      }
      return null;
    }
  };

  this.getDisplayName = propertyPath => {
    propertyPath = propertyPath.map(subPropertyName => subPropertyName.split('.')).flat();
    if (isPrimitive || !(propertyPath instanceof Array) || propertyPath.length === 0) {
      return settings.displayName || propertyName;
    } else if (subProperties.hasOwnProperty(propertyPath[0])) {
      return subProperties[propertyPath[0]].getDisplayName(propertyPath.slice(1));
    } else {
      return 'Unknown';
    }
  };

  this.isAutoIncremented = () => {
    if (isPrimitive) {
      return type === 'id' && settings.autoIncrement === true;
    } else {
      for (const subPropertyName in subProperties) {
        if (subProperties[subPropertyName].isAutoIncremented()) return true;
      }
      return false;
    }
  };

  this.isId = () => {
    if (types.hasOwnProperty(type) && typeof types[type].getIdFromContent === 'function') {
      return true;
    } else if (settings.hasOwnProperty('connector')) {
      if (settings.connector.key === 'key' || settings.connector.key === 'basename') return true;
    }
    return false;
  };

  this.getIdPropertyPath = () => {
    if (isPrimitive) return this.isId() ? [propertyName] : null;
    for (const subPropertyName in subProperties) {
      const possibleIdProperty = subProperties[subPropertyName].getIdPropertyPath();
      if (possibleIdProperty instanceof Array) return [propertyName].concat(possibleIdProperty);
    }
    return null;
  };

  this.getIdFromContent = data => {
    if (isPrimitive) {
      if (types.hasOwnProperty(type) && typeof types[type].getIdFromContent === 'function') {
        return types[type].getIdFromContent(data);
      } else if (settings.hasOwnProperty('connector')) {
        if (settings.connector.key === 'key' || settings.connector.key === 'basename') return data;
      }
      return null;
    } else {
      if (typeof data !== 'object' || data === null) return null;
      for (const subPropertyName in subProperties) {
        if (data.hasOwnProperty(subPropertyName)) {
          const id = subProperties[subPropertyName].getIdFromContent(data[subPropertyName]);
          if (id) return id;
        }
      }
      return null;
    }
  };

  this.render = (action, options, entityId) => {
    const hasRenderMethod = types.hasOwnProperty(type) && types[type].hasOwnProperty(action);
    if (isPrimitive || hasRenderMethod) {
      const uri = this.getUri(entityId);
      const content = this.getContent(entityId);
      const status = this.getStatus(entityId);
      const TAG = render.element(xyz, action, uri, [], status, content, settings, options);
      return TAG;
    } else {
      const DIV = document.createElement('DIV');
      for (const subPropertyName in subProperties) {
        const TAG = subProperties[subPropertyName].render(action, options, entityId);
        DIV.appendChild(TAG);
      }
      return DIV;
    }
  };

  this.checkAccess = (subPropertyPath, method, groups) => {
    if (!settings.hasOwnProperty('access')) return false;
    for (const verb in settings.access) {
      if (accessVerbsToMethods.hasOwnProperty(verb)) {
        if (accessVerbsToMethods[verb].includes(method)) {
          for (const group of groups) {
            if (settings.access[verb].includes(group)) return true;
          }
        }
      }
    }
    return false;
  };
};
