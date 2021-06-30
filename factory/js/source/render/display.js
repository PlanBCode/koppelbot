const displays = require('../../build/displays');
const uriTools = require('../uri/uri.js');
const variables = require('../variables/variables.js');
const {DisplayItem} = require('./displayItem.js');
const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';

const uiElements = [];

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

const renderDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName, requestId) => { // XYZ123
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const requestUri = typeof requestId !== 'undefined'
    ? uri.split(';')[requestId]
    : uri;
  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClassName, entityId, node, requestUri, requestId);
  uiElementFirst(display, displayItem);
  uiElementEntity(display, displayItem);
};

const removeDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName, requestId) => { // XYZ123
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  const display = displays[displayName];
  const action = options.action || DEFAULT_ACTION;
  const requestUri = typeof requestId !== 'undefined'
    ? uri.split(';')[requestId]
    : uri;

  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClassName, entityId, node, requestUri, requestId);
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
  WRAPPER.entityIds = {};
  const requestUris = uri.split(';');
  const displayListeners = [];
  for (const requestUri of requestUris) {
    const availableListeners = xyz.on(requestUri, 'available', (entityClassName, entityId, node, eventName, requestId) => {
      if (WRAPPER.entityIds.hasOwnProperty(entityClassName + '_' + requestId + '_' + entityId)) return;
      const path = uriTools.pathFromUri(requestUri);
      path[1] = entityId;

      if (xyz.isAvailable(path)) { // TODO move to listeners?
        WRAPPER.entityIds[entityClassName + '_' + requestId + '_' + entityId] = true;
        const entityPath = requestUri.split('/');
        entityPath[2] = entityId;
        const entityUri = entityPath.join('/');
        const entityContent = xyz.getContent(entityUri)[entityClassName][entityId]; // TODO check
        renderDisplay(xyz, uri, options, WRAPPER)(entityClassName, entityId, entityContent, eventName, requestId);
      }
    });
    const removedListeners = xyz.on(requestUri, 'removed', (entityClassName, entityId, node, eventName, requestId) => {
      if (!WRAPPER.entityIds.hasOwnProperty(entityClassName + '_' + requestId + '_' + entityId)) return;
      delete WRAPPER.entityIds[entityClassName + '_' + requestId + '_' + entityId];
      removeDisplay(xyz, uri, options, WRAPPER)(entityClassName, entityId, node, eventName, requestId);
    });
    displayListeners.push(...availableListeners, ...removedListeners);
  }

  displayListenersPerWrapper.set(WRAPPER, displayListeners);
};

function UiElement (xyz, options, WRAPPER) {
  const {uri, aggregations, labels} = uriTools.parseAggregationFromUri(options.uri);
  options.uri = uri;
  options.labels = labels;
  options.aggregations = aggregations;
  for (const optionName of ['select', 'multiSelect', 'viewBoxSelect']) {
    if (options[optionName]) {
      const [propertyName, defaultValue] = options[optionName].split('=');
      if (typeof defaultValue !== 'undefined') {
        if (!variables.hasVariable(propertyName)) variables.setVariable(propertyName, defaultValue);
        options[optionName] = propertyName;
      }
    }
  }
  WRAPPER.classList.add('xyz-ui-wrapper');
  const displayName = options.display || DEFAULT_DISPLAYNAME;
  if (!displays.hasOwnProperty(displayName)) throw new Error('Unrecognized displayName.');

  const display = displays[displayName]; // TODO check?
  const action = options.action || DEFAULT_ACTION;

  const path = uriTools.pathFromUri(uri);
  const entityId = path[1] || '*';
  const entityClass = path[0];

  const displayItem = new DisplayItem(xyz, action, options, WRAPPER, entityClass, entityId, null, uri, undefined);

  uiElementWaitingForData(display, displayItem);
  const readyCallback = uri => { // Nb this can be called multiple times on variable changes,
    uiElementEmpty(display, displayItem);
    addListeners(xyz, uri, options, WRAPPER);
    xyz.get(uri);
  };

  const contentVariables = {};

  const variableNames = uriTools.getVariableNamesFromUri(uri);
  const variableListeners = {}; // variableName -> {listener, resolvedVariableName}

  const onChange = () => {
    updateVariableListeners();
    const resolvedUri = uriTools.resolveVariablesInUri(uri, contentVariables);
    if (uriTools.uriHasUnresolvedVariables(resolvedUri)) uiElementWaitingForInput(display, displayItem);
    else readyCallback(resolvedUri);
  };

  const updateVariableListeners = () => {
    for (const variableName of variableNames) {
      const resolvedVariableName = uriTools.resolveVariablesInUri(variableName, contentVariables);
      if (uriTools.uriHasUnresolvedVariables(resolvedVariableName)) continue;
      // if resolvement did not change anything, do nothing
      if (variableListeners.hasOwnProperty(variableName) && variableListeners[variableName].resolvedVariableName === resolvedVariableName) continue;

      let listener;
      variableListeners[variableName] = {listener, resolvedVariableName};

      if (resolvedVariableName.startsWith('/')) {
        listener = xyz.on(resolvedVariableName, 'touched', (entityClassName, entityId, node, eventName, requestId) => {
          if (typeof node === 'object' && node !== null && typeof node.getContent === 'function') {
            let content = node.getContent();
            if (content instanceof Array) content = content.join(',');
            contentVariables[resolvedVariableName] = content;
            onChange();
          }
        });
        if (!xyz.isAvailable(resolvedVariableName.split('/').slice(1))) xyz.get(resolvedVariableName);
      } else {
        listener = variables.onVariable(resolvedVariableName, onChange);
      }
      variableListeners[variableName].listener = listener;
    }
  };
  updateVariableListeners();

  const waitCallback = () => uiElementWaitingForInput(display, displayItem);
  registerUri(xyz, uri, contentVariables, readyCallback, waitCallback, options.dynamic);
}

const renderUiElement = (xyz, options, WRAPPER) => {
  const uiElement = new UiElement(xyz, options, WRAPPER);
  uiElements.push(uiElement);
};

// DISPLAY DATA REFRESHING TODO : NEEDS TO BE IMPROVED

const uriCallbacks = {};

function refresh () {
  for (let uri in uriCallbacks) {
    const xyz = uriCallbacks[uri][0].xyz;
    const contentVariables = uriCallbacks[uri][0].contentVariables; // TODO fix
    uri = uriTools.resolveVariablesInUri(uri, contentVariables);
    // uri starting without '/' are input variables
    if (!uriTools.uriHasUnresolvedVariables(uri) && uri.startsWith('/')) xyz.get(uri);
  }
}

function handleUri (uri, callbacks) {
  const contentVariables = callbacks.contentVariables;
  uri = uriTools.resolveVariablesInUri(uri, contentVariables);
  if (typeof callbacks.wait === 'function') callbacks.wait(uri);
  if (!uriTools.uriHasUnresolvedVariables(uri)) callbacks.ready(uri);
}

// TODO parametrize refresh rate / throttle
const registerUri = (xyz, uri, contentVariables, readyCallback, waitCallback, dynamic = false) => {
  const callbacks = {xyz, ready: readyCallback, wait: waitCallback, contentVariables};

  if (dynamic) { // skip updates for non dynamic
    if (!uriCallbacks.hasOwnProperty(uri)) uriCallbacks[uri] = [callbacks];
    else uriCallbacks[uri].push(callbacks);
  }

  handleUri(uri, callbacks);
};

setInterval(refresh, 1000); // TODO clean up

exports.renderUiElement = renderUiElement;
