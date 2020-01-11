const DEFAULT_TYPE = 'string';
const DEFAULT_ACTION = 'view';
const DEFAULT_DISPLAY = 'view';

const subscriptions = [];
const variables = {};

const uriCallbacks = {};

/*
drilldown

- on variable change
- on data update
 */

function handleUri(uri, callback) {
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
        callback(uri);
    } else {
        //TODO render not ready
    }
}

function getVariable(variableName) {
    return variables[variableName];
}

function updateVariable(variableName, value) {
    if (value !== variables[variableName]) {
        variables[variableName] = value;
        for (let uri in uriCallbacks) {
            if (uri.indexOf('$' + variableName) !== -1) { // TODO find ${variableName} and ignore $variableNameWithPostfix
                for (let callback of uriCallbacks[uri]) {
                    handleUri(uri, callback)
                }
            }
        }
    }
}

function registerUri(uri, callback) {
    if (!uriCallbacks.hasOwnProperty(uri)) {
        uriCallbacks[uri] = [callback];
    } else {
        uriCallbacks[uri].push([callback]);
    }
    handleUri(uri, callback);
}

function request(method, uri, data, dataCallback, errorCallback) {
    const location = 'http://localhost:8888/site/'; //TODO determine dynamically
    const xhr = new XMLHttpRequest();
    xhr.open(method, location + 'api' + uri, true);

    xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
            //      if (xhr.status >= 200 && xhr.status <= 299) {
            console.log(xhr.responseText);
            dataCallback(xhr.responseText);
        }
    };
    xhr.send(data);
}

const expand = (action, meta, data, uri, options) => {
    const dom = {};
    for (let propertyName in meta) {
        const settings = meta[propertyName];
        const content = data[propertyName];
        const subUri = uri + '/' + propertyName;
        if (settings.hasOwnProperty('type')) { //TODO this can collide with a property named 'type' SEE collapse
            dom[propertyName] = renderEntity(action, uri, content, settings, options);
        } else {
            dom[propertyName] = expand(action, settings, content, subUri, options);
        }
    }
    return dom;
};

const collapse = (data, meta, dom, options, f) => {
    for (let propertyName in meta) {
        const settings = meta[propertyName];
        const subData = data[propertyName];
        const subDom = dom[propertyName];
        if (settings.hasOwnProperty('type')) { //TODO this can collide with a property named 'type' SEE expand
            f(propertyName, subDom, subData);
        } else {
            collapse(subData, settings, subDom, options, f);
        }
    }
};


function view(DIV, options, data, meta, dom) {
    let html = '<table class="xyz-view">';
    //TODO handle error/mixed statuses
    for (let entityClass in data) {
        const entityClassMeta = Object.values(meta[entityClass])[0];
        for (let entityId in data[entityClass]) {
            const f = (propertyName, dom, data) => {
                html += `<tr><td>${propertyName}:</td><td>${dom}</td></tr>`;
            };
            collapse(data[entityClass][entityId], entityClassMeta, dom[entityClass][entityId], options, f);
        }
    }
    html += '</table>';
    DIV.innerHTML = html;
}

function list(DIV, options, data, meta, dom) {
    const TABLE = document.createElement('TABLE');
    TABLE.className = 'xyz-list';

    //TODO option.select, options.multiselect
    // TODO drilldown
    //TODO handle error/mixed statuses
    for (let entityClass in data) {

        const entityClassMeta = Object.values(meta[entityClass])[0];

        let firstEntityOfClass = true;
        const TR_header = document.createElement('TR');
        TR_header.className = 'xyz-list-header';
        TABLE.appendChild(TR_header);

        for (let entityId in data[entityClass]) {
            const TR = document.createElement('TR');
            TR.classList.add('xyz-list-item');
            if (options.drillDown) {
                if (getVariable(options.drillDown) === entityId) {
                    TR.classList.add('xyz-list-highlight');
                }
                TR.onclick = () => {
                    xyz.updateVariable(options.drillDown, entityId);
                    for (let row of TABLE.childNodes) {
                        if (row === TR) {
                            row.classList.add('xyz-list-highlight');
                        } else {
                            row.classList.remove('xyz-list-highlight');
                        }
                    }
                };
            }
            const f = (propertyName, dom, data) => {
                if (firstEntityOfClass) {
                    //TODO dit werkt nog niet voor subproperties
                        const TD = document.createElement('TD');
                        TD.innerHTML = propertyName;
                        TR_header.appendChild(TD);
                }
                const TD = document.createElement('TD');
                TD.innerHTML = dom;
                TR.appendChild(TD);
            };

            collapse(data[entityClass][entityId], entityClassMeta, dom[entityClass][entityId], options, f);
            TABLE.appendChild(TR);

            firstEntityOfClass = false;
        }
    }
    DIV.innerHTML = '';
    DIV.appendChild(TABLE);
}

const renderEntity = (action, uri, content, settings, options) => {
    const type = settings.type || DEFAULT_TYPE;
    if (xyz.types.hasOwnProperty(type)) {
        if (xyz.types[type].hasOwnProperty(action)) {
            return xyz.types[type][action](uri, content, settings, options);
        } else if (settings.hasOwnProperty('combined')) { // create editor from combined view
            let html = '';
            //TODO check if content if object
            //TODO check if settings.combined is object
            for (let subPropertyName in settings.combined) {
                const subSettings = settings.combined[subPropertyName];
                html += renderEntity(action, uri + '/' + subPropertyName, content[subPropertyName], subSettings, options);
            }
            return html;
        } else {
            //TODO something default and/or error
        }
    } else {
        //TODO something default and/or error
    }
};


const renderDisplay = (DIV, options) => (uri) => {
    const action = options.action || DEFAULT_ACTION;
    const display = options.display || DEFAULT_DISPLAY;
    //TODO combine into single POST request
    request('GET', uri + '?meta', undefined, meta => {//TODO add querystring better
        meta = JSON.parse(meta);
        request('GET', uri, undefined, data => {//TODO add querystring better
            const dom = {};
            data = JSON.parse(data); // TODO handle parsing errors
            //TODO handle error/mixed statuses
            for (let entityClass in meta) {
                if (!dom.hasOwnProperty(entityClass)) {
                    dom[entityClass] = {};
                }
                const entityClassMeta = Object.values(meta[entityClass])[0];
                for (let entityId in data[entityClass]) {
                    if (!dom[entityClass].hasOwnProperty(entityId)) {
                        dom[entityClass][entityId] = {};
                    }
                    const uri = '/' + entityClass + '/' + entityId;
                    dom[entityClass][entityId] = expand(action, entityClassMeta, data[entityClass][entityId], uri, options);
                }
            }
            //TODO check existence/ if function type -> custom display
            xyz.displays[display](DIV, options, data, meta, dom);
        });
    })
};

function ui(uri, options) {
    options = options || {};
    const SCRIPT = document.currentScript;
    const DIV = document.createElement('DIV');
    SCRIPT.parentNode.insertBefore(DIV, SCRIPT);
    SCRIPT.parentNode.removeChild(SCRIPT);

    registerUri(uri, renderDisplay(DIV, options));
}

function put(uri, content) {
    //todo clientside validate
    request('PUT', uri, content, response => {
        //TODO check for errors
        console.log(response)
    });
}

const xyz = {
    ui,
    put,
    updateVariable,
//    eventDrillDown,
    types: {},
    displays: {
        view,
        list
    }
};
