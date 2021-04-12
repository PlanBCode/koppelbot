const request = require('./request.js');
const uriTools = require('../uri/uri.js');

const on = (xyz, entityClasses, uri, eventName, callback) => {
  // TODO check eventName, callback and uri

  if (eventName.startsWith('access:')) {
    for (const requestUri of uri.split(';')) {
      addAccessListener(xyz, entityClasses, requestUri, eventName, callback); // TODO add requestId? // XYZ123
    }
    return []; // TODO return something?
  }
  const listeners = [];
  const requestUris = uri.split(';');
  for (let requestId = 0; requestId < requestUris.length; ++requestId) {
    const [requestUri, queryString] = requestUris[requestId].split('?');

    const entityClassNames = uriTools.getEntityClassNames(requestUri, entityClasses);
    request.retrieveMeta(xyz, entityClasses, requestUri, () => {
      const subPath = uriTools.pathFromUri(requestUri).slice(1);
      for (const entityClassName of entityClassNames) {
        if (entityClasses.hasOwnProperty(entityClassName)) {
          const entityClassListeners = entityClasses[entityClassName].addListener(subPath, eventName, callback, requestId, queryString);
          listeners.push(...entityClassListeners);
        } else {
        // TODO callback 404 on listener
        // if eventName = 'error' or 404  callback(entityClassName);
        }
      }
    });
  }
  return listeners;
};

const accessListeners = [];
let initialized = false;

function checkAccess (xyz, uri, eventName) {
  const method = eventName.split(':')[1].toUpperCase(); // 'access:GET' or 'access:PUT'
  return xyz.checkAccess(uri, method);
}

const monitorSessionChanges = xyz => () => {
  xyz.get('/session/*', () => {
    for (const accessListener of accessListeners) {
      const state = checkAccess(xyz, accessListener.uri, accessListener.eventName);
      if (state !== accessListener.state) {
        // DEBUG console.log('callListener ', accessListener.uri + ':' + accessListener.eventName);
        accessListener.callback(state);
        accessListener.state = state;
      }
    }
  });
};

// a listener that fires when changes to access level are detected (login/out)
function addAccessListener (xyz, entityClasses, uri, eventName, callback) {
  request.retrieveMeta(xyz, entityClasses, uri, () => {
    const state = checkAccess(xyz, uri, eventName);
    accessListeners.push({uri, eventName, callback, state});
    if (!initialized) { // setup listener to check for updates in sessions
      on(xyz, entityClasses, '/session/*', 'touched', monitorSessionChanges(xyz));
      initialized = true;
    } else {
    // DEBUG console.log('callListener ', uri + ':' + eventName);
      callback(state);
    }
  });
}

exports.on = on;
