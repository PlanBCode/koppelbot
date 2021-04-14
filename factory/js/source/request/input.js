const json = require('../web/json');
const State = require('../entity/state.js').State;

function changed (a, b) {
  switch (typeof a) {
    case 'string':
    case 'number':
    case 'boolean':
      return a !== b;
    case 'undefined':
      return typeof b !== 'undefined';
    case 'function':
      return false;
    case 'object':
      if (a === null) return b !== null;
      else if (typeof b !== 'object' || b === null) return true;
      else if (a instanceof Array) {
        if (!(b instanceof Array)) return true;
        if (a.length !== b.length) return true;
        for (let i = 0; i < a.length; ++i) {
          if (changed(a[i], b[i])) return true;
        }
        return false;
      } else {
        for (const key in a) {
          if (b.hasOwnProperty(key)) {
            if (changed(a[key], b[key])) return true;
          } else return true;
        }
        for (const key in b) {
          if (!a.hasOwnProperty(key)) return true;
        }
        return false;
      }
  }
}

function updateContents (path, state, method, responseStatus, responseContent, contents, entityId) {
  // TODO use to determine state.setChanged? const prevPropertyContent = contents[entityId];
  switch (responseStatus) {
    case 200:
      if ((method === 'PATCH' || method === 'PUT' || method === 'POST') && responseContent === null) {
        const content = json.get(responseContent, path, null);
        contents[entityId] = json.set(contents[entityId], path, content, null);
      } else if (method === 'GET') {
        if (typeof responseContent !== 'undefined') {
          if (changed(contents[entityId], responseContent)) state.setChanged();
          contents[entityId] = responseContent;
        }
      } else if (method === 'DELETE') {
        if (path.length === 0) state.setRemoved();
        else state.setChanged();
        json.unset(contents[entityId], path, null);
        if (path.length === 0) delete contents[entityId];
      }
      break;
    case 400:
      // TODO check if error is new eg compare with current error in errors
      state.setError(400, responseContent || 'Bad request');
      break;
    case 403:
      // TODO check if error is new eg compare with current error in errors
      state.setError(403, responseContent || 'Forbidden');
      break;
    case 404:
      // TODO check if error is new eg compare with current error in errors
      state.setError(404, responseContent || 'Not found');
      break;
    default:
      // state.setError(); // TODO compare with current error in errors
      throw new Error('Unsupported status ' + responseStatus);
  }
}

exports.handlePrimitive = (element, contents, statusses) => (path, method, entityId, responseStatus, responseContent, requestContent, queryString, entityExisted, requestId) => {
  if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
  if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');
  // DEBUG console.log('Input::handlePrimitive', path, method, entityId, queryString, 'entityExisted', entityExisted);

  const state = new State(method);
  if (contents.hasOwnProperty(entityId)) {
    updateContents(path, state, method, responseStatus, responseContent, contents, entityId);
  } else if (entityId === '*') {
    for (const entityId in contents) {
      updateContents(path, state, method, responseStatus, responseContent, contents, entityId);
    }
  } else { // if 200 then changed else error
    switch (responseStatus) {
      case 200:
        if (typeof responseContent !== 'undefined') {
          if (method === 'DELETE') {
            if (path.length === 0) state.setRemoved();
            else state.setChanged();
          } else {
            state.setCreated();
            state.setChanged();
            // for post and put methods, if no responseContent is returned, use the the requestContent instead
            contents[entityId] = ((method === 'PUT' || method === 'POST' || method === 'PATCH') && responseContent === null)
              ? requestContent
              : responseContent;
          }
        }
        break;
      case 400:
        // TODO use message frop source if available
        // TODO check if error is new eg compare with current error in errors
        state.setError(400, 'Bad Request');
        break;
      case 403:
        // TODO use message frop source if available
        // TODO check if error is new eg compare with current error in errors
        state.setError(403, 'Forbidden');
        break;
      case 404:
        // TODO use message frop source if available
        // TODO check if error is new eg compare with current error in errors
        state.setError(404, 'Not found');
        break;
      default:
        // state.setError(); TODO compare with current error in errors
        throw new Error('Unsupported status ' + responseStatus);
    }
  }
  statusses[entityId] = state.getStatus();
  element.callListeners(state, entityId, queryString, entityExisted, requestId);
  return state;
};

function zipSubPaths (subPaths) {
  const path = [];
  const xMatch = false;
  const minLength = Math.max(...subPaths.map(subPath => subPath.length));
  for (let i = 0; i < minLength; ++i) {
    let x;
    for (const subPath of subPaths) {
      if (typeof x === 'undefined') x = subPath[0];
      else if (x !== subPath[0]) { // [[...,'a','b'],[...,'b','c']] => [...,'a.b,c.d']
        const tails = subPaths.map(subPath => subPath.slice(i).join('.'));
        path.push(tails.join(','));
        return path;
      }
    }
    if (!xMatch) path.push(x); // [[...,'a',...],[...,'a',...]] => [...,'a',...]
  }
  return path;
}
/*

['a','b'] -> ['b']
['a.b'] -> ['b']
['a.b,a.c','d'] -> ['b,c','d']
['a.b','d'] -> ['b.d',d'] TODO
['a,a.b'] -> ['*,b'] TODO
 */
const getSubPath = (path, propertyName) => {
  if (path.length === 0) return [];
  const subPaths = [];
  for (const subPropertName of path[0].split(',')) {
    if (propertyName === subPropertName) { // ['a','b'] -> ['b']
      const subPath = path.slice(1);
      subPaths.push(subPath);
    } else if (subPropertName.startsWith(propertyName + '.')) { // ['a.b',d,...] -> ['b',d,...]
      const subPath = subPropertName.split('.').slice(1).concat(path.slice(1));
      subPaths.push(subPath);
    }
  }
  return zipSubPaths(subPaths);
};

exports.getSubPath = getSubPath;

/*
({'a':'b'},'a',[]) -> 'b'
({'a.b':'c'},'a',['b']) -> 'c'
 */

function getSubContent (content, propertyName, subPath) {
  if (typeof content !== 'object' || content === null) return null;
  if (content instanceof Array) {
    return content[propertyName]; // TODO
  } else {
    if (content.hasOwnProperty(propertyName)) return content[propertyName];
    for (const contentPropertyName in content) { // TODO
      const propertyPath = [propertyName].concat(subPath).join('.');
      if (propertyPath === contentPropertyName || propertyPath.startsWith(contentPropertyName + '.')) {
        return content[contentPropertyName];
      }
    }
    return null;
  }
}

exports.handle = (element, statusses, subProperties, entities) => (path, method, entityId, responseStatus, responseContent, requestContent, queryString, entityExisted, requestId) => {
  if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
  if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');
  const state = new State(method);

  // TODO handle other methods?
  if (entities) { // only for entity
    if (!entities.hasOwnProperty(entityId) && method === 'GET') {
      entityExisted = false;
      state.setCreated(); // TODO here lies the problem!!
    } else entityExisted = true;
    entities[entityId] = true; // TODO hier moet meer mee
  }
  // DEBUG console.log('Input::handle', path, entityId, queryString, 'entityExisted', entityExisted);

  if (responseStatus === 207) {
    for (const subPropertyName in subProperties) {
      if (responseContent.hasOwnProperty(subPropertyName)) {
        const subProperty207Wrapper = responseContent[subPropertyName];
        if (subProperty207Wrapper === null || typeof subProperty207Wrapper !== 'object' ||
                    !subProperty207Wrapper.hasOwnProperty('status') ||
                    !subProperty207Wrapper.hasOwnProperty('content')
        ) {
          // TODO reponse is in error
          console.error('error response in wrong format');
        } else {
          const subPath = getSubPath(path, subPropertyName);
          const subStatus = subProperty207Wrapper.status;
          const subResponseContent = getSubContent(subProperty207Wrapper.content, subPropertyName, subPath);
          const subRequestContent = getSubContent(requestContent, subPropertyName, subPath);
          const subProperty = subProperties[subPropertyName];
          const subState = subProperty.handleInput(subPath, method, entityId, subStatus, subResponseContent, subRequestContent, queryString, entityExisted, requestId);
          state.addSubState(subState);
        }
      }
    }
  } else {
    for (const subPropertyName in subProperties) {
      if (responseContent !== null && typeof responseContent === 'object' && responseContent.hasOwnProperty(subPropertyName)) {
        const subPath = getSubPath(path, subPropertyName);
        const subResponseContent = getSubContent(responseContent, subPropertyName, subPath);
        const subRequestContent = getSubContent(requestContent, subPropertyName, subPath);
        const subProperty = subProperties[subPropertyName];
        const subState = subProperty.handleInput(subPath, method, entityId, responseStatus, subResponseContent, subRequestContent, queryString, entityExisted, requestId);
        state.addSubState(subState);
      }
    }
  }
  statusses[entityId] = state.getStatus();
  return state;
};
