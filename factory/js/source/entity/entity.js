const Property = require('./property.js').constructor;
const listener = require('./listener.js');
const uriTools = require('../uri/uri.js');
const State = require('./state.js').State;
const response = require('./response.js');
const input = require('../request/input.js');
const {getQueryParameter} = require('../web/web');

function compileSettings (rawSettings) {
  const settings = {};
  const rootSettings = rawSettings.hasOwnProperty('_') ? rawSettings._ : {};
  for (const propertyName in rawSettings) {
    if (propertyName !== '_') {
      settings[propertyName] = {...rootSettings};
      for (const id in rawSettings[propertyName]) {
        if ((id === 'access' || id === 'connector') && rootSettings.hasOwnProperty(id)) {
          settings[propertyName][id] = {...rootSettings[id], ...rawSettings[propertyName][id]};
        } else {
          settings[propertyName][id] = rawSettings[propertyName][id];
        }
      }
    }
  }
  return settings;
}

function EntityClass (xyz, entityClassName, rawSettings) {
  const settings = compileSettings(rawSettings);

  if (typeof entityClassName !== 'string') throw new TypeError('entityClassName not a string.');

  const entities = {}; // TODO mark if entities are new or have been removed
  const statusses = {};

  listener.Handler.call(this);

  const properties = {};

  for (const propertyName in settings) {
    properties[propertyName] = new Property(xyz, this, propertyName, settings[propertyName]);
  }

  this.hasSetting = settingName => settings.hasOwnProperty(settingName);
  this.getSetting = settingName => settings[settingName];
  this.getSettings = () => settings;

  this.getEntityClassName = () => entityClassName;

  this.getUri = entityId => {
    if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
    return '/' + entityClassName + '/' + entityId;
  };
  this.getPath = entityId => [entityClassName, entityId];

  const addEntityListener = (entityId, path, eventName, callback) => {
    const listeners = [];
    if (path.length === 0) {
      const listener = this.addAtomicListener(entityId, eventName, callback, '', entities);
      listeners.push(listener);
    } else {
      const propertNameList = path[0];
      const propertyNames = propertNameList === '*'
        ? Object.keys(properties)
        : propertNameList.split(',');
      const subPath = path.slice(1);
      for (const propertyName of propertyNames) {
        if (properties.hasOwnProperty(propertyName)) {
          const propertyListeners = properties[propertyName].addPropertyListener(entityId, subPath, eventName, callback);
          listeners.push(...propertyListeners);
        } else {
          // TODO throw error?
          console.error(propertyName + ' not available');
        }
      }
    }
    return listeners;
  };

  this.addListener = (path, eventName, callback) => {
    // TODO check path, callback and eventName
    // TODO only if path.length <= 1 ? otherwise send to properties
    const listeners = [];
    const entityIds = (path.length === 0 || path[0] === '*')
      ? ['*']
      : path[0].split(',');
    const subPath = path.splice(1);
    for (const entityId of entityIds) {
      const entityListeners = addEntityListener(entityId, subPath, eventName, callback);
      listeners.push(...entityListeners);
    }
    return listeners;
  };

  this.getResponse = (path, entityId, method) => {
    const propertyNames = (path.length === 0 || path[0] === '*')
      ? Object.keys(properties)
      : path[0].split(',');
    const content = {};
    for (const propertyName of propertyNames) {
      const basePropertyName = propertyName.split('.')[0];
      if (properties.hasOwnProperty(basePropertyName)) {
        const subPath = input.getSubPath(path, basePropertyName);
        content[basePropertyName] = properties[basePropertyName].getResponse(subPath, entityId, method);
      } else {
        content[basePropertyName] = new response.Node(this, entityId, 400, null, [`${basePropertyName} does not exist.`], method); // TODO
      }
    }
    // TODO use query

    return content;
  };

  // TODO MAYBE make private /remove
  this.getEntityClassResponse = (path, method, entityIds) => {
    if (typeof entityIds === 'undefined') {
      entityIds = (path.length === 0 || path[0] === '*')
        ? Object.keys(entities)
        : path[0].split(',');
    }
    const content = {};
    const subPath = path.slice(1);

    for (const entityId of entityIds) {
      const entityContent = entities.hasOwnProperty(entityId)
        ? this.getResponse(subPath, entityId, method)
        : new response.Node(this, entityId, 404, null, [`/${entityClassName}/${entityId} not found.`], method); // TODO
      content[entityId] = entityContent;
    }
    return content;
  };

  this.createCreator = (options, data, INPUT_submit, displayMessage) => {
    const TABLE = document.createElement('TABLE');
    TABLE.classList.add('xyz-create');
    if (options.showHeader !== false) {
      const TR_header = document.createElement('TR');
      TR_header.classList.add('xyz-create-header');
      const TD_header = document.createElement('TD');
      TD_header.setAttribute('colspan', '2');
      TR_header.appendChild(TD_header);
      TABLE.appendChild(TR_header);
      TD_header.innerText = 'New ' + entityClassName;
    }
    for (const propertyName in properties) {
      for (const TR of properties[propertyName].createCreator(options, data, INPUT_submit, displayMessage)) {
        TABLE.appendChild(TR);
      }
    }
    return TABLE;
  };

  this.getTitlePropertyPath = () => {
    let shortestTitlePropertyPath = null;
    for (const propertyName in properties) {
      const titlePropertyPath = properties[propertyName].getTitlePropertyPath();
      if (titlePropertyPath !== null && (shortestTitlePropertyPath === null || shortestTitlePropertyPath.length > titlePropertyPath.length + 1)) shortestTitlePropertyPath = [propertyName].concat(titlePropertyPath);
    }
    return shortestTitlePropertyPath;
  };

  this.getDisplayName = propertyPath => {
    propertyPath = propertyPath.map(subPropertyName => subPropertyName.split('.')).flat();
    if (!(propertyPath instanceof Array) || propertyPath.length === 0) {
      return entityClassName; // TODO also add option to $entity.json for a display name
    } else if (properties.hasOwnProperty(propertyPath[0])) {
      return properties[propertyPath[0]].getDisplayName(propertyPath.slice(1));
    } else return 'Unknown';
  };

  this.isAutoIncremented = () => {
    for (const propertyName in properties) {
      if (properties[propertyName].isAutoIncremented()) return true;
    }
    return false;
  };

  this.getIdProperty = () => {
    for (const propertyName in properties) {
      const property = properties[propertyName];
      if (property.isId()) return propertyName;
    }
    return null;
  };

  this.getIdPropertyPath = () => {
    for (const propertyName in properties) {
      const possibleIdProperty = properties[propertyName].getIdPropertyPath();
      if (possibleIdProperty instanceof Array) return possibleIdProperty;
    }
    return null;
  };

  this.getIdFromContent = data => {
    if (typeof data !== 'object' || data === null) return null;
    for (const propertyName in properties) {
      if (data.hasOwnProperty(propertyName)) {
        const id = properties[propertyName].getIdFromContent(data[propertyName]);
        if (id) return id;
      }
    }
    return null;
  };

  this.callListeners = (state, entityId) => { // TODO pass method?
    this.callAtomicListeners(state, entityId, this.getResponse([], entityId, state.getMethod()));
  };

  const handleEntityIdInput = input.handle(this, statusses, properties, entities);

  this.handleInput = (path, method, entityClassStatus, entityClassContent, requestContent, entityIds) => {
    const state = new State(method);
    if (entityClassStatus === 207) {
      for (const entityId of entityIds) {
        const entity207Wrapper = entityClassContent[entityId];
        if (entity207Wrapper === null || typeof entity207Wrapper !== 'object' ||
                    !entity207Wrapper.hasOwnProperty('status') ||
                    !entity207Wrapper.hasOwnProperty('content')
        ) {
          // TODO reponse is in error
          console.error('error response in wrong format');
        } else {
          const entityStatus = entity207Wrapper.status;
          const entityContent = entity207Wrapper.content;
          const requestEntityId = method === 'POST' ? 'new' : entityId; // for POST the request is done with new TODO fix for multiple
          const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[requestEntityId] : null;
          const subPath = path.slice(1);
          const entityState = handleEntityIdInput(subPath, method, entityId, entityStatus, entityContent, subRequestContent);
          // TODO check with query
          state.addSubState(entityState);
        }
      }
    } else {
      // TODO if error set error
      //            state.setError(404, 'Not found');
      for (const entityId of entityIds) {
        const entityContent = (entityClassContent === null || typeof entityClassContent !== 'object')
          ? null
          : entityClassContent[entityId];
        const requestEntityId = method === 'POST' ? 'new' : entityId; // for POST the request is done with new TODO fix for multiple
        const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[requestEntityId] : null;
        const subPath = path.slice(1);
        const entityState = handleEntityIdInput(subPath, method, entityId, entityClassStatus, entityContent, subRequestContent);
        state.addSubState(entityState);
      }
    }
    return state;
  };

  this.getSubObject = propertyName => properties[propertyName];

  this.render = (action, options, entityId, subPath) => {
    const propertyNames = typeof subPath === 'undefined' || subPath[0] === '*'
      ? Object.keys(properties)
      : subPath[0].split(',');

    const DIV = document.createElement('DIV');
    for (const propertyName of propertyNames) {
      if (properties.hasOwnProperty(propertyName)) {
        const TAG = properties[propertyName].render(action, options, entityId);
        DIV.appendChild(TAG);
      } else {
        // TODO error?
      }
    }
    return DIV;
  };

  this.checkAccess = (propertyPath, method, groups) => {
    if (propertyPath.length === 0) {
      const idPropertyPath = this.getIdPropertyPath();
      if (idPropertyPath instanceof Array && idPropertyPath.length > 0) {
        return properties[idPropertyPath[0]].checkAccess([], method, groups);
      }
      return false;
    } else {
      const subPropertyPath = propertyPath.slice(1);
      const propertyNames = propertyPath[0] === '*' ? Object.keys(properties) : propertyPath[0].split(',');
      for (const propertyName of propertyNames) {
        if (!properties.hasOwnProperty(propertyName)) return false;
        else if (!properties[propertyName].checkAccess(subPropertyPath, method, groups)) return false;
      }
    }
    return true;
  };
}
/**
 * Handle the input in case the uri contains multiple requests
 * @param  {[type]} method          [description]
 * @param  {[type]} uri             [description]
 * @param  {[type]} status          [description]
 * @param  {[type]} responseContent [description]
 * @param  {[type]} requestContent  [description]
 * @param  {[type]} entityClasses   [description]
 * @returns {void}
 */
const handleMultiInput = (method, uri, status, responseContent, requestContent, entityClasses) => {
  if (uri.includes(';')) {
    if (!(responseContent instanceof Array) || (!(requestContent instanceof Array) && requestContent !== null)) {
      // TODO
      console.warn('Attention', responseContent, requestContent);
    }
    const requestUris = uri.split(';');
    for (let requestId = 0; requestId < requestUris.length; ++requestId) {
      const requestUri = requestUris[requestId];
      const subQueryString = requestUri.split('?')[1] || '';
      const subMethod = getQueryParameter('method', subQueryString) || method;
      const subRequestContent = requestContent === null ? null : requestContent[requestId];
      if (status === 207) {
        const subResponseContent = responseContent[requestId].content; // TOOD check
        const subStatus = responseContent[requestId].status;
        handleInput(subMethod, requestUri, subStatus, subResponseContent, subRequestContent, entityClasses);
      } else {
        handleInput(subMethod, requestUri, status, responseContent[requestId], subRequestContent, entityClasses);
      }
    }
  } else handleInput(method, uri, status, responseContent, requestContent, entityClasses);
};

const handleInput = (method, uri, status, responseContent, requestContent, entityClasses) => {
  const state = new State(method);
  // TODO check status

  const path = uriTools.pathFromUri(uri);
  const entityClassNameList = path[0]; // TODO error if no entityClass
  const entityIdList = path[1] || '*';
  const entityClassNames = entityClassNameList.split(',');
  if (status === 207) {
    for (const entityClassName of entityClassNames) {
      const entityClass207Wrapper = responseContent[entityClassName];
      if (entityClass207Wrapper === null || typeof entityClass207Wrapper !== 'object' ||
                !entityClass207Wrapper.hasOwnProperty('status') ||
                !entityClass207Wrapper.hasOwnProperty('content')
      ) {
        console.error('error response in wrong format');// TODO
      } else {
        const entityClassStatus = entityClass207Wrapper.status;
        const entityClassContent = entityClass207Wrapper.content;
        const entityClass = entityClasses[entityClassName];
        const entityIds = (entityIdList === '*')
          ? Object.keys(entityClassContent)
          : entityIdList.split(',');
        const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[entityClassName] : null;
        const subPath = path.slice(1);
        const entityClassState = entityClass.handleInput(subPath, method, entityClassStatus, entityClassContent, subRequestContent, entityIds);
        state.addSubState(entityClassState);
      }
    }
  } else {
    for (const entityClassName of entityClassNames) {
      const entityClassContent = responseContent[entityClassName];
      const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[entityClassName] : null;
      const subPath = path.slice(1);
      if (entityClassContent === null || typeof entityClassContent !== 'object') {
        const entityIds = entityIdList === '*'
          ? []
          : entityIdList.split(',');
        const entityClass = entityClasses[entityClassName];
        const entityClassState = entityClass.handleInput(subPath, method, 404, {}, subRequestContent, entityIds);
        state.addSubState(entityClassState);
      } else {
        const entityIds = entityIdList === '*'
          ? Object.keys(entityClassContent)
          : entityIdList.split(',');
        const entityClass = entityClasses[entityClassName];
        const entityClassState = entityClass.handleInput(subPath, method, status, entityClassContent, subRequestContent, entityIds);
        state.addSubState(entityClassState);
      }
    }
  }
  return state;
};

/**
 * [getResponse description]
 * @param  {[type]} uri                   [description]
 * @param  {[type]} entityClasses         [description]
 * @param  {[type]} method                [description]
 * @param  {[type]} entityIdsPerClassName   Object containing the entityIds per entity class
 * @returns {[type]}                       [description]
 */
function getResponse (uri, entityClasses, method, entityIdsPerClassName) {
  const path = uriTools.pathFromUri(uri);
  const entityClassNames = (path.length === 0 || path[0] === '*')
    ? Object.keys(entityClasses)
    : path[0].split(',');
  const content = {};
  const subPath = path.slice(1);
  for (const entityClassName of entityClassNames) {
    if (entityClasses.hasOwnProperty(entityClassName)) {
      let entityIds;
      if (typeof entityIdsPerClassName === 'object' && entityIdsPerClassName !== null) {
        entityIds = entityIdsPerClassName.hasOwnProperty(entityClassName) ? entityIdsPerClassName[entityClassName] : [];
      } else entityIds = undefined;
      content[entityClassName] = entityClasses[entityClassName].getEntityClassResponse(subPath, method, entityIds);
    } else {
      // TODO replace null with something that has the endpoints required by Node
      content[entityClassName] = new response.Node(null, '*', 404, null, [`/${entityClassName} not found.`], method); // TODO
    }
  }
  return content;
}

/**
 * Handle the input in case the uri contains multiple requests
 * @param  {string} uri                   [description]
 * @param  {[type]} entityClasses         [description]
 * @param  {string} method                [description]
 * @param  {[type]} entityIdsPerClassName [description]
 * @returns {void}                       [description]
 */
function getMultiResponse (uri, entityClasses, method, entityIdsPerClassName) {
  const isMultiRequest = uri.includes(';');
  if (isMultiRequest) {
    const requestUris = uri.split(';');
    const content = [];
    for (const requestUri of requestUris) {
      const subQueryString = requestUri.split('?')[1] || '';
      const subMethod = getQueryParameter('method', subQueryString) || method;
      const subContent = getResponse(requestUri, entityClasses, subMethod, entityIdsPerClassName);
      content.push(subContent);
    }
    return content;
  } else return getResponse(uri, entityClasses, method, entityIdsPerClassName);
}

const isAutoIncremented = (entityClasses, entityClassName) => {
  return entityClassName === '*' || !entityClasses.hasOwnProperty(entityClassName)
    ? false
    : entityClasses[entityClassName].isAutoIncremented();
};

const getTitlePropertyPath = (entityClasses, entityClassName) => {
  return entityClasses.hasOwnProperty(entityClassName)
    ? entityClasses[entityClassName].getTitlePropertyPath()
    : null;
};

const getDisplayName = (entityClasses, entityClassName, propertyPath) => {
  return entityClasses.hasOwnProperty(entityClassName)
    ? entityClasses[entityClassName].getDisplayName(propertyPath)
    : 'Unknown';
};

// checks if user has access to given method and uri
const checkAccess = (entityClasses, uri, method) => {
  const groups = ['guest'];
  if (entityClasses.hasOwnProperty('session')) {
    const response = getResponse('/session/*/groups', entityClasses, 'GET');
    if (response.hasOwnProperty('session')) {
      for (const sessionId in response.session) {
        const session = response.session[sessionId];
        const sessionGroups = session.groups;
        if (!sessionGroups.hasErrors()) {
          const g = sessionGroups.getContent();
          if (g instanceof Array) {
            groups.push.apply(groups, sessionGroups.getContent());
          }
        }
      }
    }
    // TODO make groups unique
  }
  const entityClassNames = uriTools.getEntityClassNames(uri, entityClasses);
  const subPath = uriTools.pathFromUri(uri).slice(2);
  for (const entityClassName of entityClassNames) {
    if (!entityClasses.hasOwnProperty(entityClassName) ||
            !entityClasses[entityClassName].checkAccess(subPath, method, groups)) return false;
  }
  return true;
};

exports.isAutoIncremented = isAutoIncremented;
exports.getTitlePropertyPath = getTitlePropertyPath;
exports.getDisplayName = getDisplayName;
exports.checkAccess = checkAccess;

exports.getMultiResponse = getMultiResponse;
exports.Class = EntityClass;
exports.handleMultiInput = handleMultiInput;
