const State = require('./state.js').State;
const eventNames = [
  'changed',
  'created',
  'removed',
  'touched', // created, changed or deleted
  'available' // on first retrieved/created
]; // TODO , 'error'
const response = require('./response.js');

function Listener (listenerHandler, eventName, entityId, subUri) {
  this.stop = () => {
    listenerHandler.removeListener(this);
  };
  this.getSubUri = () => subUri;
  this.getEntityId = () => entityId;
  this.getEventName = () => eventName;
}

function ListenerHandler () {
  const listenersPerEntityIdPerEventNamePerSubUri = {};

  const callListeners = (eventName, entityId, listenerEntityId, node, subUri, requestId) => {
    // DEBUG console.log('callListener', listenerEntityId, this.getUri(entityId) + '//' + (subUri || '') + ':' + eventName);

    if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(listenerEntityId)) { // Nb  '*' case is handled by callAllListeners
      const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[listenerEntityId];
      if (listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
        const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
        const entityClassName = this.getEntityClassName();
        if (typeof subUri === 'undefined') { // if no subUri is specified, call all subUri's
          for (const subUri in listenersPerSubUri) {
            const subPath = subUri === '' ? [] : subUri.split('/');
            const subNode = response.getSubNode(node, subPath);
            // DEBUG console.log('1-> callListener', this.getUri(entityId) + '//' + subPath.join('/') + ':' + eventName, subNode);
            if (subNode) {
              // DEBUG console.log('2-> callListener', this.getUri(entityId) + '//' + subPath.join('/') + ':' + eventName);
              const listeners = listenersPerSubUri[subUri];
              listeners.forEach(callback => callback(entityClassName, entityId, subNode, eventName, requestId));
            }
          }
        } else if (listenersPerSubUri.hasOwnProperty(subUri)) {
          const subPath = subUri === '' ? [] : subUri.split('/');
          const subNode = response.getSubNode(node, subPath);
          // DEBUG console.log('1-> callListener', this.getUri(entityId) + '//' + subPath.join('/') + ':' + eventName, subNode);
          if (subNode) {
            // DEBUG console.log('2-> callListener', this.getUri(entityId) + '//' + subPath.join('/') + ':' + eventName);
            const listeners = listenersPerSubUri[subUri];
            listeners.forEach(callback => callback(entityClassName, entityId, subNode, eventName, requestId));
          }
        }
      }
    }
  };

  const callAllListeners = (eventName, entityId, node, subUri, requestId) => {
    if (eventNames.indexOf(eventName) === -1) throw new Error('Listener eventName "' + eventName + '"  is not in allowed event names: ' + eventNames.join(', ') + '.');
    callListeners(eventName, entityId, '*', node, subUri, requestId);
    callListeners(eventName, entityId, entityId, node, subUri, requestId);
  };

  this.callAtomicListeners = (state, entityId, node, subUri, queryString, entityExisted, requestId) => {
    // DEBUG console.log('callAtomicListeners', entityId, this.getUri(entityId) + '//' + (subUri || ''), listenersPerEntityIdPerEventNamePerSubUri, queryString, 'entityExisted', entityExisted);

    if (typeof entityId !== 'string') throw new TypeError('entityId is not a string.');
    if (!(state instanceof State)) throw new TypeError('state is not a State.');
    if (state.isRemoved()) {
      callAllListeners('changed', entityId, node, subUri, requestId);
      callAllListeners('removed', entityId, node, subUri, requestId);
    } else if (state.isExtended()) {
      callAllListeners('available', entityId, node, subUri, requestId); // TODO check if extention applicable to listener?
    } else if (state.isCreated() || !entityExisted) { // TODO fix
      callAllListeners('created', entityId, node, subUri, requestId);
      callAllListeners('changed', entityId, node, subUri, requestId);
    } else if (state.isChanged()) {
      callAllListeners('changed', entityId, node, subUri, requestId);
      // TODO }else if(state.hasErrors()){
      //   callAllListeners('error', entityId, node, subUri,requestId);
    } else {
      // nothing to do
    }
  };

  // used for touched event, to immediately return current available data
  const callListenerWithAvailableEntities = (eventName, entityId, callback, subUri, contents, requestId, queryString) => {
    const availableEntityIds = this.getAvailableEntityIds(entityId, queryString);
    const subPath = subUri === '' ? [] : subUri.split('/');
    const entityClassName = this.getEntityClassName();
    // DEBUG console.log('callListenerWithAvailableEntities', this.getUri(entityId) + '//' + subPath.join('/') + ':' + eventName);

    for (const entityId of availableEntityIds) {
      const node = this.getResponse(subPath, entityId, 'GET');
      callback(entityClassName, entityId, node, eventName);
    }
    /*

    if (entityId === '*') {
      for (const entityId in contents) {
        const node = this.getResponse(subPath, entityId, 'GET');
        callback(entityClassName, entityId, node, eventName);
      }
    } else {
      const node = this.getResponse(subPath, entityId, 'GET');
      callback(entityClassName, entityId, node, eventName);
    } */
  };
  // contents = entities = {[entityId]:true,...} for entities
  this.addAtomicListener = (entityId, eventName, callback, subUri, contents, requestId, queryString) => {
    // TODO use requestId
    if (typeof subUri === 'undefined') subUri = '';
    if (typeof subUri !== 'string') throw new TypeError('Listener subUri is not a string.');
    if (typeof callback !== 'function') throw new TypeError('Listener callback is not a function.');
    if (typeof entityId !== 'string') throw new TypeError('Listener entityId is not a string.');
    if (typeof eventName !== 'string') throw new TypeError('Listener eventName is not a string.');
    if (eventNames.indexOf(eventName) === -1) throw new Error('Listener eventName "' + eventName + '"  is not in allowed event names: ' + eventNames.join(', ') + '.');

    // DEBUG console.log('addListener', this.getUri(entityId) + '/' + subUri + ':' + eventName, requestId, queryString);

    if (eventName === 'available') { // if available then fire the listeners for existing items
      callListenerWithAvailableEntities(eventName, entityId, callback, subUri, contents, requestId, queryString);
      this.addAtomicListener(entityId, 'created', callback, subUri, contents, requestId, queryString);
    } else if (eventName === 'touched') { // if touched then fire the listeners for existing items
      callListenerWithAvailableEntities(eventName, entityId, callback, subUri, contents, requestId, queryString);
      eventName = 'changed';
    }

    if (!listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
      listenersPerEntityIdPerEventNamePerSubUri[entityId] = {};
    }
    const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];

    if (!listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
      listenersPerEventNamePerSubUri[eventName] = {};
    }
    const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
    if (!listenersPerSubUri.hasOwnProperty(subUri)) {
      listenersPerSubUri[subUri] = new Map();
    }
    const listeners = listenersPerSubUri[subUri];
    const listener = new Listener(this, eventName, entityId, subUri); // TODO requestId, queryString
    listeners.set(listener, callback);

    // DEBUG for debug reasons output listener counts:
    /* let count = 0;
    for (const entityId in listenersPerEntityIdPerEventNamePerSubUri) {
      const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];
      for (const eventName in listenersPerEventNamePerSubUri) {
        const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
        for (const subUri in listenersPerSubUri) {
          const listeners = listenersPerSubUri[subUri];
          count += listeners.size;
        }
      }
    }
     console.log('addListener', this.getUri(entityId) + '/' + subUri + ':' + eventName, count);
     */
    return listener;
  };

  this.removeListener = listener => {
    if (!(listener instanceof Listener)) throw new TypeError('listener is not a Listener.');

    const entityId = listener.getEntityId();
    if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
      const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];
      const eventName = listener.getEventName();
      if (listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
        const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
        const subUri = listener.getSubUri();
        if (listenersPerSubUri.hasOwnProperty(subUri)) {
          const listeners = listenersPerSubUri[subUri];
          if (listeners.has(listener)) {
            listeners.delete(listener);
            return true;
          }
        }
      }
    }
    return false;
  };
}

exports.Handler = ListenerHandler;
