function XYZ() {
    const DEFAULT_TYPE = 'string';
    const DEFAULT_ACTION = 'view';
    const DEFAULT_DISPLAY = 'view';
    const DEFAULT_TAG = 'DIV';

    const pathFromUri = uri => {
        if (uri.startsWith('/')) {
            uri = uri.substr(1);
        }
        if (uri.endsWith('/')) {
            uri = uri.slice(0, -1);
        }
        return uri.split('/');
    };

    const wrapContent = (uri, content) => {
        const wrapper = {};
        const path = pathFromUri(uri);
        let wrapperIterator = wrapper;
        for (let depth = 0; depth < path.length; ++depth) {
            const key = path[depth];
            wrapperIterator = wrapperIterator[key] = (depth === path.length - 1) ? content : {};
        }
        return wrapper;
    };

    const entityClasses = {};
    const variables = {};
    this.types = {}; //todo make 'private' use xyz.registerType(name, type)  in the $type.js scripts
    const displays = {}; // TODO create this.registerDisplay(name, mapper)
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

    displays.list = options => (PARENT, content, key, uri, status, depth, primitive) => {
        if (depth === 0) {
            const TABLE = document.createElement('TABLE');
            TABLE.className = 'xyz-list';
            const TR_header = document.createElement('TR');
            TR_header.className = 'xyz-list-header';
            if (options.multiSelect) {
                const TD = document.createElement('TD');
                TR_header.appendChild(TD);
            }
            TABLE.appendChild(TR_header);
            PARENT.appendChild(TABLE);
            return TABLE;
        } else if (depth === 2) {
            const TABLE = PARENT;
            const entityId = key;
            const TR = document.createElement('TR');
            TR.className = 'xyz-list-item';
            if (options.multiSelect) {
                const variableName = options.multiSelect;
                const TD = document.createElement('TD');
                const INPUT = document.createElement('INPUT');
                INPUT.type = "checkbox";
                INPUT.onclick = event => {
                    const entityIds = this.hasVariable(variableName)
                        ? this.getVariable(variableName).split(',')
                        : [];
                    if (INPUT.checked) {
                        if (!entityIds.includes(entityId)) {
                            entityIds.push(entityId);
                        }
                    } else {
                        const index = entityIds.indexOf(entityId);
                        if (index !== -1) {
                            entityIds.splice(index, 1);
                        }
                    }
                    if (entityIds.length === 0) {
                        this.clearVariable(variableName);
                    } else {
                        this.setVariable(variableName, entityIds.join(','));
                    }
                    event.stopPropagation();
                };
                TD.appendChild(INPUT);
                TR.appendChild(TD);
            }
            if (options.select) {
                if (this.getVariable(options.select) === entityId) {
                    TR.classList.add('xyz-list-selected');
                }
                TR.onclick = () => {
                    this.setVariable(options.select, entityId);
                    for (let row of TABLE.childNodes) {
                        if (row === TR) {
                            row.classList.add('xyz-list-selected');
                        } else {
                            row.classList.remove('xyz-list-selected');
                        }
                    }
                };
            }
            TABLE.appendChild(TR);
            return TR;
        } else if (primitive) {
            const TR = PARENT;
            const TABLE = TR.parentNode;
            const TR_header = TABLE.firstChild;
            let found = false;
            for (let TD_header of TR_header.childNodes) {
                if (TD_header.innerHTML === key) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                const TD_header = document.createElement('TD');
                TD_header.innerHTML = key;
                TR_header.appendChild(TD_header);
            }
            const TD = document.createElement('TD');
            TD.appendChild(content);
            TR.appendChild(TD);
            return null;
        } else {
            return PARENT;
        }
    };

    displays.view = options => (PARENT, content, key, uri, status, depth, primitive) => {
        if (depth === 0) {
            const TABLE = document.createElement('TABLE');
            PARENT.appendChild(TABLE);
            return TABLE;
        } else if (primitive) {
            const TR = document.createElement('TR');
            if (options.showLabel !== false) {
                const TD_label = document.createElement('TD');
                TD_label.innerHTML = key;
                TR.appendChild(TD_label);
            }
            const TD_content = document.createElement('TD');
            TD_content.innerHTML = content;
            TR.appendChild(content);
            PARENT.appendChild(TR);
            return null;
        } else {
            return PARENT;
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

    function Response() {
        let primitive;
        const subResponses = {};
        let status;
        let content;
        this.getStatus = () => status;
        this.getContent = () => {
            //TODO if not primitive => throw
            return content;
        };
        this.setContent = (status_, content_) => {
            primitive = true;
            status = status_;
            content = content_;
        };
        this.set = (key, subResponse) => {
            primitive = false;
            const subStatus = subResponse.getStatus();
            subResponses[key] = subResponse;
            if (Object.keys(subResponses).length === 0) {
                status = subStatus;
            } else if (status !== subStatus) {
                status = 207;
            }
        };
        this.isPrimitive = () => primitive;

        // func = (subResponse, propertyName, response) => {}
        this.forEach = func => {
            if (primitive === true) {
                //TODO throw error
            } else {
                for (let propertyName in subResponses) {
                    const subResponse = subResponses[propertyName];
                    func(subResponse, propertyName, this);
                }
            }
        };
        this.toObject = () => {
            if (primitive === true) {
                return content;
            } else if (primitive === false) {
                const object = {};
                for (let propertyName in subResponses) {
                    object[propertyName] = subResponses[propertyName].toObject();
                }
                return object;
            } else {
                return undefined;
            }

        };
        // transformation = (content,  uri, status, depth) => {...}
        this.transform = (transformation, uri, depth) => {
            uri = typeof uri === 'undefined' ? '' : uri;
            depth = typeof depth === 'undefined' ? 0 : depth;
            const node = new Response();
            if (primitive) {
                const transformedContent = transformation(content, uri, status, depth);
                node.setContent(status, transformedContent);
            } else {
                this.forEach((subResponse, key) => {
                    const transformedSubResponse = subResponse.transform(transformation, uri + '/' + key, depth + 1);
                    node.set(key, transformedSubResponse);
                })
            }
            return node;
        };
        // reduction = ( accumulator, content, uri, status, depth, primitive) => {...}
        this.reduce = (reduction, base, uri, depth) => {
            uri = typeof uri === 'undefined' ? '' : uri;
            depth = typeof depth === 'undefined' ? 0 : depth;
            let accumulator = base;
            if (primitive) {
                accumulator = reduction(accumulator, content, uri, status, depth, true);
            } else {
                for (let propertyName in subResponses) {
                    const subResponse = subResponses[propertyName];
                    const subContent = subResponse.reduce(reduction, base, uri + '/' + propertyName, depth + 1);
                    accumulator = reduction(accumulator, subContent, uri, status, depth, false);
                }
            }
            return accumulator;
        };

        // mapping = ( accumulator, content, key, uri, status, depth, primitive) => {...}
        this.map = (mapping, parent, key, uri, depth) => {
            uri = typeof uri === 'undefined' ? '' : uri;
            depth = typeof depth === 'undefined' ? 0 : depth;
            key = typeof key === 'undefined' ? '' : key;
            if (primitive) {
                mapping(parent, content, key, uri, status, depth, true);
                return null;
            } else {
                const node = mapping(parent, content, key, uri, status, depth, false);
                for (let propertyName in subResponses) {
                    const subResponse = subResponses[propertyName];
                    subResponse.map(mapping, node, propertyName, uri + '/' + propertyName, depth + 1);
                }
                return node;
            }
        };
        this.filter_ = path => {
            if (path.length === 0 && primitive) {
                const response = new Response();
                response.setContent(status, this.toObject());
                return response;
            }
            const response = new Response();
            let propertyNames;
            if (path[0] === '*' || path.length === 0) {
                propertyNames = Object.keys(subResponses);
            } else {
                propertyNames = path[0].split(',');
            }
            for (let propertyName of propertyNames) {
                const subResponse = subResponses[propertyName].filter_(path.slice(1));
                response.set(propertyName, subResponse);
            }
            return response;
        };

        this.filter = uri => {
            return this.filter_(pathFromUri(uri));
        };
        this.keys = () => Object.keys(subResponses);
        this.has = key => subResponses.hasOwnProperty(key);
        this.get = key => subResponses[key];
    }


    function Property(propertyName, meta) {
        let primitive = true;
        const subProperties = {};
        const type = meta.type;
        //TODO handle type alliasses?
        const settings = meta;
        if (settings.hasOwnProperty('signature')) {
            primitive = false;
            for (let propertyName in settings.signature) {
                subProperties[propertyName] = new Property(propertyName, settings.signature[propertyName]);
            }
        }

        this.createResponse = (status, content) => {
            const response = new Response();
            if (primitive) {
                response.setContent(status, content);
            } else if (status === 207) {
                for (let propertyName in subProperties) {//TODO check if data is of this shape
                    const property = subProperties[propertyName];
                    const subStatus = content[propertyName].status; //TODO check if data is of this shape
                    const subContent = content[propertyName].content;
                    const subResponse = property.createResponse(subStatus, subContent);
                    response.set(propertyName, subResponse)
                }
            } else if (status === 200) {
                for (let propertyName in subProperties) {//TODO check if data is of this shape
                    const property = subProperties[propertyName];
                    const subContent = content[propertyName];
                    const subResponse = property.createResponse(200, subContent);
                    response.set(propertyName, subResponse)
                }
            } else {

                //TODO problems
            }
            return response;
        };

        this.createCreator = (options, data) => {
            const TRs = [];
            if (xyz.types.hasOwnProperty(type) && xyz.types[type].hasOwnProperty('edit')) {
                const uri = ''; //TODO
                const content = settings.hasOwnProperty('default') ? settings.default : null;
                // TODO html label for gebruiken
                const TR = document.createElement('TR');
                const TD_label = document.createElement('TD');
                TD_label.innerText = propertyName;
                TR.appendChild(TD_label);
                const onChange = content => {
                    data[propertyName] = content;
                };
                const element = xyz.types[type].edit(uri, content, settings, options, onChange);
                const TD_content = document.createElement('TD');
                TD_content.appendChild(element);
                TR.appendChild(TD_content);
                TRs.push(TR);
            } else if (!primitive) {
                for (let propertyName in subProperties) {
                    data[propertyName] = {};
                    TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName]));
                }
            }
            return TRs;
        };
    }

    function Entity(entityClass, meta) {
        const properties = {};
        for (let propertyName in meta) {
            properties[propertyName] = new Property(propertyName, meta[propertyName]);
        }

        this.createResponse = (status, content) => {
            const response = new Response();
            if (status === 207) {
                for (let propertyName in properties) {//TODO check if data is of this shape
                    const property = properties[propertyName];
                    const subStatus = content[propertyName].status; //TODO check if data is of this shape
                    const subContent = content[propertyName].content;
                    const subResponse = property.createResponse(subStatus, subContent);
                    response.set(propertyName, subResponse)
                }
            } else if (status === 200) {
                for (let propertyName in properties) {//TODO check if data is of this shape
                    const property = properties[propertyName];
                    const subContent = content[propertyName];
                    const subResponse = property.createResponse(200, subContent);
                    response.set(propertyName, subResponse)
                }
            } else {

                //TODO problems
            }
            return response;
        };

        this.createCreator = (options, data) => {
            const TABLE = document.createElement('TABLE');
            for (let propertyName in properties) {
                for (let TR of properties[propertyName].createCreator(options, data)) {
                    TABLE.appendChild(TR);
                }
            }
            return TABLE;
        }
    }

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
        if (this.types.hasOwnProperty(type)) {
            if (this.types[type].hasOwnProperty(action)) {
                let onChange;
                if (action === 'edit') {
                    onChange = content => {
                        xyz.patch(uri, wrapContent(uri, content));
                    }
                }
                return this.types[type][action](uri, content, settings, options, onChange);
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
            const mapper = displays[display](options); // TODO check if exists,use default or custom otherwise
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
            const entityClassName = pathFromUri(uri)[0];
            const entityId = 'new'
            const entityClass = entityClasses[entityClassName];
            const data = {};
            const TABLE = entityClass.createCreator(options, data);
            TAG.appendChild(TABLE);
            const INPUT = document.createElement('INPUT');
            INPUT.type = 'submit';
            INPUT.onclick = () => {
                this.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);
            };
            TAG.appendChild(INPUT);
        });
    }

}

const xyz = new XYZ();