const Entity = require('./entity/entity.js').constructor;
const Response = require('./response/response.js').constructor;
const uriTools = require('./uri/uri.js');
const types = require('./types/types.js').types;

const displays = {
    list: require('./display/list.js').render,
    view: require('./display/view.js').render
};

const DEFAULT_TYPE = 'string';
const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAY = 'view';
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

    /*========================================================================================
    NEEDS REWORK
    ========================================================================================*/
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

    /*========================================================================================
    ========================================================================================*/


    const retrieveMeta = (uri, callback) => {
        const path = uri.substr(1).split('/');
        const entityClassNameList = path[0]; // TODO error if no entityClass

        const entityClassNames = entityClassNameList.split(',').filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));
        if (entityClassNames.length === 0) {
            callback();
        } else {
            request('GET', '/' + entityClassNames.join(',') + '?meta', undefined, (status, content) => {//TODO add querystring better
                //TODO check status
                const data = JSON.parse(content); //TODO check
                for (let entityClassName of entityClassNames) {
                    entityClasses[entityClassName] = new Entity(entityClassName, data[entityClassName]['*']);
                }
                callback();
            });
        }
    };

    const storeData = (uri, status, content) => {
        //TODO check status
        content = JSON.parse(content);//TODO check
        const response = new Response();
        const path = uri.substr(1).split('/');
        const entityClassNameList = path[0]; // TODO error if no entityClass
        const entityIdList = path[1] || '*';
        const entityClassNames = entityClassNameList.split(',');
        for (let entityClassName of entityClassNames) {  //TODO handle statusses (207)
            const entityClassResponse = new Response();
            const entityClass = entityClasses[entityClassName];
            let entityIds;
            if (entityIdList === '*') { //TODO handle statusses (207)
                entityIds = Object.keys(content[entityClassName]);
            } else {
                entityIds = entityIdList.split(',');
            }
            for (let entityId of entityIds) {  //TODO handle statusses (207)
                const entityIdResponse = entityClass.createResponse(status, content[entityClassName][entityId]);
                entityClassResponse.set(entityId, entityIdResponse);
            }
            response.set(entityClassName, entityClassResponse);
        }
        return response;
    };

    // callback = Response =>{}
    // get the requested uri from cache or request it from server
    this.get = (uri, callback) => {
        // get the meta data
        retrieveMeta(uri, () => {
            //TODO meta should be good or we have a problem
            //TODO get the data from cache if already in cache
            request('GET', uri, undefined, (status, content) => {//TODO add querystring better
                const response = storeData(uri, status, content);
                callback(response);
            });
        });
    };

    this.patch = (uri, content, callback) => {
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('PATCH', uri, content, (status, response) => {
            //TODO check for errors
            console.log(response)
            //TODO callback
        });
    };

    this.put = (uri, content, callback) => {
        console.log('put', uri, content)
        content = typeof content === 'string' ? content : JSON.stringify(content);
        request('PUT', uri, content, (status, response) => {
            //TODO check for errors
            console.log(response)
            //TODO callback
        });
    };

    this.head = (uri, content, callback) => {
        //TODO
    };
    //this.post = (uri,content, callback)=> {};


    const renderNode = (action, options) => (content, uri, status,) => {
        //TODO how to get settings here?
        const settings = {};
        const type = settings.type || DEFAULT_TYPE;
        if (types.hasOwnProperty(type)) {
            if (types[type].hasOwnProperty(action)) {
                let onChange;
                if (action === 'edit') {
                    onChange = content => {
                        this.patch(uri, uriTools.wrapContent(uri, content));
                    }
                }
                return types[type][action](uri, content, settings, options, onChange);;
            } else if (settings.hasOwnProperty('signature')) { // create editor from signature view
                let html = '';
                //TODO check if content if object
                //TODO check if settings.signature is object
                const DIV = document.createElement('DIV');
                for (let subPropertyName in settings.signature) {
                    const subSettings = settings.signature[subPropertyName];
                    const element = renderNode(action, uri + '/' + subPropertyName, subSettings, options)(status, content[subPropertyName]);
                    DIV.appendChild(element);
                }
                return DIV;
            } else {
                //TODO something default and/or error
            }
        } else {
            //TODO something default and/or error
        }
    };

    const renderDisplay = (TAG, options) => (uri) => {
        this.get(uri, response => {
            const action = options.action || DEFAULT_ACTION;
            const display = options.display || DEFAULT_DISPLAY;
            const node = response.transform(renderNode(action, options));
            const f = node.filter(uri);
            const mapper = displays[display](options, this); // TODO check if exists,use default or custom otherwise
            TAG.innerHTML = '';
            TAG.classList.remove('xyz-waiting');
            f.map(mapper, TAG);
        });
    };

    this.ui = (uri, options) => {
        options = options || {};
        const SCRIPT = document.currentScript;
        const tag = options.tag || DEFAULT_TAG;
        const TAG = document.createElement(tag);
        if (options.id) {
            TAG.id = options.id;
        }
        if (options.class) {
            TAG.class = options.class || '';
        }
        SCRIPT.parentNode.insertBefore(TAG, SCRIPT);
        SCRIPT.parentNode.removeChild(SCRIPT);
        registerUri(uri,
            renderDisplay(TAG, options),
            uri => {
                TAG.classList.add('xyz-waiting');
                TAG.innerHTML = 'Not ready'
            }
        );
    };

    this.create = (uri, options) => {
        options = options || {};
        const SCRIPT = document.currentScript;
        const tag = options.tag || DEFAULT_TAG;
        const TAG = document.createElement(tag);
        if (options.id) {
            TAG.id = options.id;
        }
        if (options.class) {
            TAG.class = options.class || '';
        }
        SCRIPT.parentNode.insertBefore(TAG, SCRIPT);
        SCRIPT.parentNode.removeChild(SCRIPT);

        retrieveMeta(uri, () => {
            const entityClassName = uriTools.pathFromUri(uri)[0];
            const entityClass = entityClasses[entityClassName];
            const data = {};
            const TABLE = entityClass.createCreator(options, data);
            TAG.appendChild(TABLE);
            const INPUT = document.createElement('INPUT');
            INPUT.type = 'submit';
            INPUT.onclick = () => {
                const entityId = entityClass.getIdFromContent(data);
                this.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);
            };
            TAG.appendChild(INPUT);
        });
    }

}

const xyz = new XYZ();
exports.ui = xyz.ui;
exports.create = xyz.create;