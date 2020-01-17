const entity = require('./entity/entity.js');
const Response = require('./response/response.js');
const uriTools = require('./uri/uri.js');
const render = require('./render/render.js');

const displays = {
    list: require('./display/list.js').render,
    item: require('./display/item.js').render
};

const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAY = 'item';
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
        if (complete) {
            callbacks.ready(uri);
        } else {
            callbacks.wait(uri);
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
                console.log(content)
                const data = JSON.parse(content); //TODO check
                for (let entityClassName of entityClassNames) {
                    entityClasses[entityClassName] = new entity.Class(entityClassName, data[entityClassName]['*']);
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
            console.log('patch response:' + response, uri)
            //TODO callback
        });
    };

    this.put = (uri, content, callback) => {
        console.log('put request', uri, content)
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('PUT', uri, content, (status, response) => {
            //TODO check for errors
            console.log('put response', uri, response)
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
            //TODO callback
        });
    };

    // callback = Response =>{}
    // get the requested uri from cache or request it from server
    this.get = (uri, callback) => {
        // get the meta data
        retrieveMeta(uri, () => {
            //TODO meta should be good or we have a problem
            //TODO get the data from cache if already in cache
            request('GET', uri, undefined, (status, content) => {//TODO add querystring better
                const test = entity.handleInput(uri, status, content, entityClasses);
                //for(let id in entityClasses){
                /*if (entityClasses.hasOwnProperty('source')) {
                    const test = entityClasses['source'].getContent([], 'fruit');
                    console.log('yes',test)
                } else {
                }
                console.log('no');
                //}*/
                const response = Response.create(uri, status, content, entityClasses);
                callback(response);
            });
        });
    };

    //============================================================
    // RENDERING should be refactored with better naming
    //============================================================

    this.renderElement = (action, uri, status, content, settings, options) => {
        return render.element(this, action, uri, status, content, settings, options);
    };

    const renderNode = (action, options) => (source, property, entityId) => {
        const uri = property.getUri(entityId);
        const settings = property.getSettings();
        const content = source.getContent();
        const status = source.getStatus();
        return this.renderElement(action, uri, status, content, settings, options);
    };

    const renderDisplay = (TAG, options) => (uri) => {
        this.get(uri, response => {
            const action = options.action || DEFAULT_ACTION;
            const display = options.display || DEFAULT_DISPLAY;
            response = response.filter(uri);
            const node = Response.transform(response, renderNode(action, options), entityClasses);
            const mapper = displays[display](options, this); // TODO check if exists,use default or custom otherwise
            TAG.innerHTML = '';
            TAG.classList.remove('xyz-waiting');
            node.map(mapper, uri, TAG);
        });
    };

    const renderUiElement = (uri, options, TAG) => {
        registerUri(uri,
            renderDisplay(TAG, options),
            uri => {
                TAG.classList.add('xyz-waiting');
                TAG.innerHTML = 'Not ready'
            }
        );
    };

    const renderUiCreate = (uri, options, TAG) => {
        retrieveMeta(uri, () => {
            const entityClassName = uriTools.pathFromUri(uri)[0];
            const entityClass = entityClasses[entityClassName];
            const data = {};
            const TABLE = entityClass.createCreator(options, data, this);
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

    this.ui = (uri, options, PARENT) => {
        options = options || {};
        let SCRIPT;
        if (typeof PARENT === 'undefined') {
            const tag = options.tag || DEFAULT_TAG;
            PARENT = document.createElement(tag);
            SCRIPT = document.currentScript;
        }
        if (options.id) {
            PARENT.id = options.id;
        }
        if (options.class) {
            PARENT.class = options.class || '';
        }
        if (SCRIPT) {
            SCRIPT.parentNode.insertBefore(PARENT, SCRIPT);
            SCRIPT.parentNode.removeChild(SCRIPT);
        }
        if (options.display === 'create') {
            renderUiCreate(uri, options, PARENT);
        } else {
            renderUiElement(uri, options, PARENT);
        }
        return PARENT;
    };
}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.create = xyz.create;