const displays = require('../../build/displays');
const uriTools = require('../uri/uri.js');
const response = require('../entity/response.js');
const variables = require('../variables/variables.js');

const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';

const displayListenersPerWrapper = new Map();

const uiElementWaitingForData = (xyz, display, action, entityClassName, uri, options, WRAPPER) => {
    WRAPPER.classList.add('xyz-waiting-for-data');
    if (display && display.hasOwnProperty('waitingForData')) {
        display.waitingForData(xyz, action, options, WRAPPER);
    } else {
        WRAPPER.innerHTML = 'Waiting for user data...';
    }
};

const uiElementWaitingForInput = (xyz, display, action, entityClassName, uri, options, WRAPPER) => {
    WRAPPER.classList.add('xyz-waiting-for-input');
    if (display && display.hasOwnProperty('waitingForInput')) {
        display.waitingForInput(xyz, action, options, WRAPPER);
    } else {
        WRAPPER.innerHTML = 'Waiting for user input...';
    }
};

const uiElementEmpty = (xyz, display, action, entityClassName, uri, options, WRAPPER) => {
    WRAPPER.classList.remove('xyz-waiting-for-input');
    WRAPPER.classList.add('xyz-empty');
    if (display && display.hasOwnProperty('empty')) {
        display.empty(xyz, action, options, WRAPPER, uri);
    } else {
        WRAPPER.innerHTML = 'Empty';
    }
};

const uiElementFirst = (xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node) => {
    if (WRAPPER.classList.contains('xyz-empty')) {
        WRAPPER.classList.remove('xyz-empty');
        if (display && display.hasOwnProperty('first')) {
            display.first(xyz, action, options, WRAPPER, entityClassName, entityId, node);
        } else {
            WRAPPER.innerHTML = '';
        }
    }
};

const uiElementEntity = (xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node) => {
    if (display && display.hasOwnProperty('entity')) {
        display.entity(xyz, action, options, WRAPPER, entityClassName, entityId, node, uri);
    } else {
        //TODO a default way of handeling stuff
    }
};

const uiElementRemove = (xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node) => {
    if (display && display.hasOwnProperty('remove')) {
        display.remove(xyz, action, options, WRAPPER, entityClassName, entityId, node,uri);
    } else {
        //TODO a default way of handeling stuff
    }
};

const renderDisplay = (xyz, uri, options, WRAPPER) => (entityClassName, entityId, node, eventName) => {
    const displayName = options.display || DEFAULT_DISPLAYNAME;
    const display = displays[displayName];
    const action = options.action || DEFAULT_ACTION;
    const path = uriTools.pathFromUri(uri);
    node = response.filter(node, path.slice(2)); // filter the content that was not requested
    uiElementFirst(xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node);
    uiElementEntity(xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node);
};

const removeDisplay = (xyz,uri,options, WRAPPER) => (entityClassName, entityId, node, eventName)=>{
    const displayName = options.display || DEFAULT_DISPLAYNAME;
    const display = displays[displayName];
    const action = options.action || DEFAULT_ACTION;
    uiElementRemove (xyz, display, action, entityClassName, entityId, uri, options, WRAPPER, node)
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
    const removedListeners = xyz.on(baseUri, 'removed', removeDisplay(xyz,uri,options,WRAPPER));

    displayListenersPerWrapper.set(WRAPPER, [...createdListeners, ...removedListeners]);
};

const renderUiElement = (xyz, options, WRAPPER) => {
    const uri = options.uri;
    const displayName = options.display || DEFAULT_DISPLAYNAME;
    if (!displays.hasOwnProperty(displayName)) throw new Error('Unrecognized displayName.');

    const display = displays[displayName]; //TODO check?
    const action = options.action || DEFAULT_ACTION;

    uiElementWaitingForData(xyz, display, action, '', uri, options, WRAPPER);

    variables.registerUri(uri, uri => {
            //TODO this can be called multiple times on variable changes,
            uiElementEmpty(xyz, display, action, '', uri, options, WRAPPER);
            xyz.get(uri, node => { //TODO this should be handled by having an available instead of created listener
                WRAPPER.classList.remove('xyz-waiting-for-data');

                for (let entityClassName in node) {
                    for (let entityId in node[entityClassName]) {
                        renderDisplay(xyz, uri, options, WRAPPER)(entityClassName, entityId, node[entityClassName][entityId]);
                    }
                }
                addListeners(xyz, uri, options, WRAPPER);
            });
        },
        () => uiElementWaitingForInput(xyz, display, action, '', uri, options, WRAPPER)
    );
};

exports.renderUiElement = renderUiElement;