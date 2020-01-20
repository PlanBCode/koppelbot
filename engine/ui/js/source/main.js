const entity = require('./entity/entity.js');
const response = require('./entity/response.js');
const uriTools = require('./uri/uri.js');
const render = require('./render/render.js');
const web = require('./web/web.js');
const displays = require('../build/displays');

const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAYNAME = 'item';
const DEFAULT_TAG = 'DIV';

function request(method, uri, data, callback) {
    //TODO allow for multiple hosts by prepending http(s)://..
    const location = 'http://localhost:8888/site/'; //TODO determine dynamically
    const xhr = new XMLHttpRequest();
    xhr.open(method, location + 'api' + uri, true);

    xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
            const status = xhr.status;
            const content = xhr.responseText;
            callback(status, content);
        }
    };
    xhr.send(data);
}

function XYZ() {
    const entityClasses = {};
    const variables = {};

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

    const loadWindowListener = window.addEventListener('load', () => {
        this.setVariables(web.getQueryParameters());
        window.removeEventListener('load', loadWindowListener);
    });

    const uriCallbacks = {};

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

    const retrieveMeta = (uri, callback) => {
        const path = uri.substr(1).split('/');
        const entityClassNameList = path[0]; // TODO error if no entityClass

        const entityClassNames = entityClassNameList.split(',').filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));
        if (entityClassNames.length === 0) {
            callback();
        } else {
            request('GET', '/' + entityClassNames.join(',') + '?meta', undefined, (status, content) => {//TODO add querystring better
                //TODO check status
                console.log(uri, content);
                const data = JSON.parse(content); //TODO check
                // TODO validate data
                for (let entityClassName of entityClassNames) {
                    if (!entityClasses.hasOwnProperty(entityClassName)) {
                        entityClasses[entityClassName] = new entity.Class(this, entityClassName, data[entityClassName]['*']);
                    }
                }
                callback();
            });
        }
    };

    this.patch = (uri, content, callback) => {
        console.log('patch request', uri, content)
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('PATCH', uri, content, (status, response) => {
            //TODO check for errors
            console.log('patch response:' + response, uri);
            const state = entity.handleInput(uri, status, content, entityClasses);
            //TODO callback?
        });
    };

    this.put = (uri, content, callback) => {
        console.log('put request', uri, content)
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('PUT', uri, content, (status, response) => {
            //TODO check for errors
            console.log('put response', uri, response)
            const state = entity.handleInput(uri, status, content, entityClasses);
            //TODO callback
        });
    };

    this.head = (uri, content, callback) => {
        //TODO
    };
    this.post = (uri, content, callback) => {
        console.log('post request', uri, content);
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('POST', uri, content, (status, response) => {
            //TODO check for errors
            console.log('post response:' + response, uri)
            const state = entity.handleInput(uri, status, content, entityClasses);
            //TODO callback
        });
    };

    // callback = Response =>{}
    // get the requested uri from cache or request it from server
    this.get = (uri, dataCallback, metaCallBack) => {
        // get the meta data

        retrieveMeta(uri, () => {
            if (typeof metaCallBack === 'function') {
                metaCallBack();
            }

            //TODO meta should be good or we have a problem
            //TODO get the data from cache if already in cache
            request('GET', uri, undefined, (status, content) => {//TODO add querystring better
                const state = entity.handleInput(uri, status, content, entityClasses);
                if (typeof dataCallback === 'function') {
                    dataCallback(state);//TODO hier wordt nog niets mee gedaan...
                }
            });
        });
    };

    //============================================================
    // RENDERING should be refactored with better naming
    //============================================================


    const renderUiCreate = (uri, options, TAG) => {
        retrieveMeta(uri, () => {
            const entityClassName = uriTools.pathFromUri(uri)[0];
            const entityClass = entityClasses[entityClassName];
            const data = {};
            const TABLE = entityClass.createCreator(options, data);
            TAG.appendChild(TABLE);
            const INPUT = document.createElement('INPUT');
            INPUT.type = 'submit';
            INPUT.onclick = () => {
                if (entityClass.isAutoIncremented()) {
                    this.post(uri, {[entityClassName]: {'new': data}},);
                } else {
                    const entityId = entityClass.getIdFromContent(data);
                    this.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);
                }
            };
            TAG.appendChild(INPUT);
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


    const renderDisplay = (uri, options, WRAPPER) => (entityId, node) => {
        const displayName = options.display || DEFAULT_DISPLAYNAME;
        const display = displays[displayName];
        const action = options.action || DEFAULT_ACTION;
        const path = uriTools.pathFromUri(uri);
        const entityClassNameList = path[0] || '*';
        response.filter(node, path.slice(2)); // filter the content that was not requested

        if (WRAPPER.classList.contains('xyz-empty')) {
            WRAPPER.classList.remove('xyz-empty');
            if (display && display.hasOwnProperty('first')) {
                display.first(this, action, options, WRAPPER, entityId, node);
            } else {
                WRAPPER.innerHTML = '';
            }
        }

        if (display && display.hasOwnProperty('entity')) {
            display.entity(this, action, options, WRAPPER, entityId, node);
        } else {
            //TODO a default way of handeling stuff
        }
    };

    const displayListenersPerWrapper = new Map();

    const renderUiElement = (uri, options, WRAPPER) => { //TODO rename
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

                this.get(uri, () => {
                    WRAPPER.classList.remove('xyz-waiting-for-data');
                }, () => {
                    const node = entity.getResponse(uri, entityClasses);
                    for (let entityClassName in node) {
                        for (let entityId in node[entityClassName]) {
                            renderDisplay(uri, options, WRAPPER)(entityId, node[entityClassName][entityId]);
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

    this.ui = (uri, options, WRAPPER) => {//TODO rename
        options = options || {};
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
            WRAPPER.class = options.class || '';
        }
        if (SCRIPT) {
            SCRIPT.parentNode.insertBefore(WRAPPER, SCRIPT);
            SCRIPT.parentNode.removeChild(SCRIPT);
        }
        if (options.display === 'create') {
            renderUiCreate(uri, options, WRAPPER);
        } else {
            renderUiElement(uri, options, WRAPPER);//TODO rename
        }
        return WRAPPER;
    };
}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.on = xyz.on;

//TODO get(Variable)
//TODO set(Variable(s))
//TODO globals()

