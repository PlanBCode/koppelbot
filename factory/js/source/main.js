const entity = require('./entity/entity.js');

const request = require('./request/request.js');
const response = require('./entity/response.js');
const uriTools = require('./uri/uri.js');
const web = require('./web/web.js');
const displays = require('../build/displays');

const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';
const DEFAULT_TAG = 'DIV';

function XYZ() {
    const entityClasses = {};
    const variables = {};

    const uriCallbacks = {};

    this.hasVariable = variableName => variables.hasOwnProperty(variableName);
    this.getVariable = (variableName, fallback) => variables.hasOwnProperty(variableName) ? variables[variableName] : fallback;

    const handleVariableChange = variableName => {
        web.setQueryParameter(variableName, variables[variableName]);

        for (let uri in uriCallbacks) {
            if (uri.indexOf('$' + variableName) !== -1) { // TODO find ${variableName} and ignore $variableNameWithPostfix
                for (let callback of uriCallbacks[uri]) {
                    handleUri(uri, callback);
                }
            }
        }
    };

    this.clearVariable = variableName => {
        delete variables[variableName];
        handleVariableChange(variableName);
    };

    this.setVariable = (variableName, value) => {
        if (value !== variables[variableName]) {
            variables[variableName] = value;
            handleVariableChange(variableName);
        }
    };

    this.setVariables = (variableObject) => {
        for (let variableName in variableObject) {
            this.setVariable(variableName, variableObject[variableName]);
        }
    };

    this.setVariables(web.getQueryParameters());

    function handleUri(uri, callbacks) {
        let complete = true;
        //TODO find ${variableName}
        uri = uri.replace(/\$(\w+)/, (_, variableName) => {
            if (variables.hasOwnProperty(variableName)) {
                return variables[variableName];
            } else {
                complete = false;
                return '$' + variableName;
            }
        });
        if (typeof callbacks.wait === 'function') {
            callbacks.wait(uri);
        }
        if (complete) {
            callbacks.ready(uri);
        }
    }

    /* setInterval(()=>{
         for(let uri in uriCallbacks){
             for(let callback of uriCallbacks[uri]){
                 handleUri(uri,callback);
             }
         }
     },2000)*/

    function registerUri(uri, readyCallback, waitCallback) {
        const callbacks = {ready: readyCallback, wait: waitCallback};
        if (!uriCallbacks.hasOwnProperty(uri)) {
            uriCallbacks[uri] = [callbacks];
        } else {
            uriCallbacks[uri].push(callbacks);
        }
        handleUri(uri, callbacks);
    }

    this.isAutoIncremented = entityClassName => entity.isAutoIncremented(entityClasses, entityClassName);

    const renderUiCreate = (options, TAG) => {
        const uri = options.uri;
        request.retrieveMeta(this, entityClasses, uri, () => {
            const entityClassName = uriTools.pathFromUri(uri)[0];
            const entityClass = entityClasses[entityClassName];
            const data = {};
            const INPUT_submit = document.createElement('INPUT');
            INPUT_submit.type = 'submit';
            const TABLE = entityClass.createCreator(options, data, INPUT_submit);
            TAG.appendChild(TABLE);
            INPUT_submit.onclick = () => {
                if (entityClass.isAutoIncremented()) {
                    this.post(uri, {[entityClassName]: {'new': data}},);
                } else {
                    const entityId = entityClass.getIdFromContent(data);
                    this.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);
                }
            };
            TAG.appendChild(INPUT_submit);
        });
        return TAG;
    };


    this.on = (uri, eventName, callback) => {
        //TODO check type, callback and uri
        const listeners = [];
        const entityClassNames = uriTools.getEntityClassNames(uri, entityClasses);
        const subPath = uriTools.pathFromUri(uri).slice(1);
        for (let entityClassName of entityClassNames) {
            if (entityClasses.hasOwnProperty(entityClassName)) {
                const entityClassListeners = entityClasses[entityClassName].addListener(subPath, eventName, callback);
                listeners.push(...entityClassListeners);
            } else {
                // TODO callback 404 on listener
                // if eventName = 'error' or 404  callback(entityClassName);
            }
        }
        return listeners;
    };


    const renderDisplay = (uri, options, WRAPPER) => (entityClassName, entityId, node) => {
        const displayName = options.display || DEFAULT_DISPLAYNAME;
        const display = displays[displayName];
        const action = options.action || DEFAULT_ACTION;
        const path = uriTools.pathFromUri(uri);
        node = response.filter(node, path.slice(2)); // filter the content that was not requested
        if (WRAPPER.classList.contains('xyz-empty')) {
            WRAPPER.classList.remove('xyz-empty');
            if (display && display.hasOwnProperty('first')) {
                display.first(this, action, options, WRAPPER, entityClassName, entityId, node);
            } else {
                WRAPPER.innerHTML = '';
            }
        }

        if (display && display.hasOwnProperty('entity')) {
            display.entity(this, action, options, WRAPPER, entityClassName, entityId, node);
        } else {
            //TODO a default way of handeling stuff
        }
    };

    const displayListenersPerWrapper = new Map();

    const renderUiElement = (options, WRAPPER) => { //TODO rename
        const uri = options.uri;
        const displayName = options.display || DEFAULT_DISPLAYNAME;
        if (!displays.hasOwnProperty(displayName)) {
            throw new Error('Unrecognized displayName.');
        }
        const display = displays[displayName]; //TODO check?
        const action = options.action || DEFAULT_ACTION;

        WRAPPER.classList.add('xyz-waiting-for-data');
        if (display && display.hasOwnProperty('waitingForData')) {
            display.waitingForData(this, action, options, WRAPPER);
        } else {
            WRAPPER.innerHTML = 'Waiting for user data...';
        }
        registerUri(uri, uri => {
                //TODO this can be called multiple times on variable changes,
                WRAPPER.classList.remove('xyz-waiting-for-input');

                WRAPPER.classList.add('xyz-empty');
                if (display && display.hasOwnProperty('empty')) {
                    display.empty(this, action, options, WRAPPER, uri);
                } else {
                    WRAPPER.innerHTML = 'Empty';
                }

                this.get(uri, node => {
                    WRAPPER.classList.remove('xyz-waiting-for-data');

                    for (let entityClassName in node) {
                        for (let entityId in node[entityClassName]) {
                            renderDisplay(uri, options, WRAPPER)(entityClassName, entityId, node[entityClassName][entityId]);
                        }
                    }

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
                    const listeners = this.on(baseUri, 'created', renderDisplay(uri, options, WRAPPER));
                    displayListenersPerWrapper.set(WRAPPER, listeners);

                }, () => {
                    //TODO is deze nog nodig?
                });
            },
            () => {
                WRAPPER.classList.add('xyz-waiting-for-input');
                if (display && display.hasOwnProperty('waitingForInput')) {
                    display.waitingForInput(this, action, options, WRAPPER);
                } else {
                    WRAPPER.innerHTML = 'Waiting for user input...';
                }
            });
    };

    this.ui = (options, WRAPPER) => {//TODO rename
        options = options || {};
        if (options.display === 'edit') {
            options.action = 'edit';
            options.display = 'item';
        }
        if (options.display === 'delete') {
            options.action = 'view';
            options.display = 'item';
            options.showDeleteButton = true;
        }
        let SCRIPT;
        if (typeof WRAPPER === 'undefined') {
            const tag = options.tag || DEFAULT_TAG;
            WRAPPER = document.createElement(tag);
            SCRIPT = document.currentScript;
        }
        if (options.id) {
            WRAPPER.id = options.id;
        }
        if (options.class) {
            WRAPPER.classList.add(options.class)
        }
        if (SCRIPT) {
            SCRIPT.parentNode.insertBefore(WRAPPER, SCRIPT);
            SCRIPT.parentNode.removeChild(SCRIPT);
        }
        if (options.display === 'create') {
            renderUiCreate(options, WRAPPER);
        } else {
            renderUiElement(options, WRAPPER);//TODO rename
        }
        return WRAPPER;
    };

    this.get = (uri, callback) => request.get(this, entityClasses, uri, callback);
    this.head = (uri) => request.head(entityClasses, uri);

    this.post = (uri, content) => request.post(entityClasses, uri, content);
    this.patch = (uri, content) => request.patch(entityClasses, uri, content);
    this.put = (uri, content) => request.put(entityClasses, uri, content);

    this.delete = uri => request.delete(entityClasses, uri);
}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.on = xyz.on;

//TODO get(Variable)
//TODO set(Variable(s))
//TODO globals()

