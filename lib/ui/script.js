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
//      console.log(xhr.responseText)
            dataCallback(xhr.responseText)
        }
    };
    xhr.send(data);
}

function view(DIV, options, data, meta, dom) {
    let html = '<table class="xyz-view">';
    //TODO handle error/mixed statuses
    for (let entityClass in data) {
        for (let entityId in data[entityClass]) {
            for (let propertyName in data[entityClass][entityId]) {
                html += `<tr><td>${propertyName}</td><td>${dom[entityClass][entityId][propertyName]}</td></tr>`;
            }
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
        const TR = document.createElement('TR');
        TR.className = 'xyz-list-header';
        TABLE.appendChild(TR);

        for (let propertyName in meta[entityClass]['*']) {
            const TD = document.createElement('TD');
            TD.innerHTML = propertyName;
            TR.appendChild(TD);
        }
        for (let entityId in data[entityClass]) {
            const TR = document.createElement('TR');
            TR.classList.add('xyz-list-item');
            TABLE.appendChild(TR);
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
            for (let propertyName in data[entityClass][entityId]) {
                const TD = document.createElement('TD');
                TD.innerHTML = dom[entityClass][entityId][propertyName];
                TR.appendChild(TD);
            }
        }
    }
    DIV.innerHTML = '';
    DIV.appendChild(TABLE);
}

const renderDisplay = (DIV, options) => (uri) => {
    const action = options.action || 'view';
    const display = options.display || 'view';
    //TODO combine into single POST request
    request('GET', uri + '?meta', undefined, meta => {//TODO add querystring better
        meta = JSON.parse(meta);
        request('GET', uri, undefined, data => {//TODO add querystring better
            const dom = {};
            data = JSON.parse(data); // TODO handle parsing errors
            //TODO handle error/mixed statuses
            for (let entityClass in data) {
                for (let entityId in data[entityClass]) {
                    for (let propertyName in data[entityClass][entityId]) {
                        const settings = Object.values(meta[entityClass])[0][propertyName];
                        const content = data[entityClass][entityId][propertyName];
                        //TODO check if exists
                        if (!dom.hasOwnProperty(entityClass)) {
                            dom[entityClass] = {};
                        }
                        if (!dom[entityClass].hasOwnProperty(entityId)) {
                            dom[entityClass][entityId] = {};
                        }
                        const type = settings.type || 'string';
                        const uri = '/' + entityClass + '/' + entityId + '/' + propertyName;
                        dom[entityClass][entityId][propertyName] = xyz.types[type][action](uri, content, settings, options);
                    }
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

function put(uri,content){
    //todo clientside validate
    request('PUT', uri ,content, response => {
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
