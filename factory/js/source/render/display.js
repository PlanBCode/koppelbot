const displays = require('../../build/displays');
const uriTools = require('../uri/uri.js');
const response = require('../entity/response.js');
const variables = require('../variables/variables.js');
const {DisplayItem} = require('./displayItem.js');
const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';

const displayListenersPerWrapper = new Map();

const uiElementWaitingForData = (display, displayItem) => {
  const WRAPPER = displayItem.getWRAPPER();
  WRAPPER.classList.add('xyz-waiting-for-data');
  if (display && display.hasOwnProperty('waitingForData')) { display.waitingForData(displayItem); } else { WRAPPER.innerHTML = 'Waiting for user data...'; }
};

const uiElementWaitingForInput = (display, displayItem) => {
  const WRAPPER = displayItem.getWRAPPER();
  WRAPPER.classList.add('xyz-waiting-for-input');
  if (display && display.hasOwnProperty('waitingForInput')) { display.waitingForInput(displayItem); } else { WRAPPER.innerHTML = 'Waiting for user input...'; }
};

const uiElementEmpty = (display, displayItem) => {
  const WRAPPER = displayItem.getWRAPPER();
  WRAPPER.classList.remove('xyz-waiting-for-input');
  WRAPPER.classList.add('xyz-empty');
  if (display && display.hasOwnProperty('empty')) { display.empty(displayItem); } else { WRAPPER.innerHTML = 'Empty'; }
};

const uiElementFirst = (display, displayItem) => {
  const WRAPPER = displayItem.getWRAPPER();
  if (WRAPPER.classList.contains('xyz-empty')) {
    WRAPPER.classList.remove('xyz-empty');
    if (display && display.hasOwnProperty('first')) { display.first(displayItem); } else { WRAPPER.innerHTML = ''; }
  }
};

const uiElementEntity = (display, displayItem) => {
  if (display && display.hasOwnProperty('entity')) { display.entity(displayItem); } else {
    // TODO a default way of handeling stuff
  }
};

const uiElementRemove = (display, displayItem) => {
  if (display && display.hasOwnProperty('remove')) { display.remove(displayItem); } else {
    // TODO a default way of handeling stuff
  }
};

const renderDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName) => {
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const path = uriTools.pathFromUri(uri);
  node = response.filter(node, path.slice(2)); // filter the content that was not requested
  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClassName, entityId, node, uri);
  uiElementFirst(display, displayItem);
  uiElementEntity(display, displayItem);
};

const removeDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName) => {
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClassName, entityId, node, uri);
  uiElementRemove(display, displayItem);
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

  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClass, entityId, null, uri);

  uiElementWaitingForData(display, displayItem);

  const readyCallback = uri => {
    // TODO this can be called multiple times on variable changes,
    uiElementEmpty(display, displayItem);
    xyz.get(uri, node => { // TODO this should be handled by having an available instead of created listener
      WRAPPER.classList.remove('xyz-waiting-for-data');

      for (const entityClassName in node) {
        for (const entityId in node[entityClassName]) {
          renderDisplay(xyz, uri, options, WRAPPER)(entityClassName, entityId, node[entityClassName][entityId]);
        }
      }

      addListeners(xyz, uri, options, WRAPPER);
    });
  };

  const onChange = () => {
    const resolvedUri = uriTools.resolveVariablesInUri(uri);
    if (uriTools.uriHasUnresolvedVariables(resolvedUri)) {
      uiElementWaitingForInput(display, displayItem);
    } else {
      readyCallback(resolvedUri);
    }
  };

  const variableNames = uriTools.getVariableNamesFromUri(uri);
  for (const variableName of variableNames) {
    variables.onVariable(variableName, onChange);
  }

  const waitCallback = () => uiElementWaitingForInput(display, displayItem);
  registerUri(xyz, uri, readyCallback, waitCallback, options.dynamic);
};

// DISPLAY DATA REFRESHING TODO : NEEDS TO BE IMPROVED

const uriCallbacks = {};

function refresh () {
  for (let uri in uriCallbacks) {
    const xyz = uriCallbacks[uri][0].xyz;
    uri = uriTools.resolveVariablesInUri(uri);
    // uri starting without '/' are input variables
    if (!uriTools.uriHasUnresolvedVariables(uri) && uri.startsWith('/')) xyz.get(uri);
  }
}

function handleUri (uri, callbacks) {
  uri = uriTools.resolveVariablesInUri(uri);
  if (typeof callbacks.wait === 'function') callbacks.wait(uri);
  if (!uriTools.uriHasUnresolvedVariables(uri)) callbacks.ready(uri);
}

// TODO parametrize refresh rate / throttle
const registerUri = (xyz, uri, readyCallback, waitCallback, dynamic = false) => {
  const callbacks = {xyz, ready: readyCallback, wait: waitCallback};

  if (dynamic) { // skip updates for non dynamic
    if (!uriCallbacks.hasOwnProperty(uri)) uriCallbacks[uri] = [callbacks];
    else uriCallbacks[uri].push(callbacks);
  }

  handleUri(uri, callbacks);
};

setInterval(refresh, 1000);

exports.renderUiElement = renderUiElement;
