const web = require('../web/web.js');

const variables = {};
const uriCallbacks = {};

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

const hasVariable = variableName => variables.hasOwnProperty(variableName);
const getVariable = (variableName, fallback) => variables.hasOwnProperty(variableName) ? variables[variableName] : fallback;

const clearVariable = variableName => {
    delete variables[variableName];
    handleVariableChange(variableName);
};

const setVariable = (variableName, value) => {
    if (value !== variables[variableName]) {
        variables[variableName] = value;
        handleVariableChange(variableName);
    }
};

const setVariables = (variableObject) => {
    for (let variableName in variableObject) {
        setVariable(variableName, variableObject[variableName]);
    }
};

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

const registerUri = (uri, readyCallback, waitCallback) => {
    const callbacks = {ready: readyCallback, wait: waitCallback};
    if (!uriCallbacks.hasOwnProperty(uri)) {
        uriCallbacks[uri] = [callbacks];
    } else {
        uriCallbacks[uri].push(callbacks);
    }
    handleUri(uri, callbacks);
};

exports.getVariable = getVariable;
exports.hasVariable = hasVariable;
exports.setVariable = setVariable;
exports.setVariables = setVariables;
exports.clearVariable = clearVariable;
exports.registerUri = registerUri;