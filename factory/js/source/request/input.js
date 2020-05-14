const json = require('../web/json');
const State = require('../entity/state.js').State;

function changed(a, b) {
    switch (typeof a) {
        case 'string':
        case 'number':
        case 'boolean':
            return a !== b;
        case 'undefined':
            return typeof b !== 'undefined';
        case 'function':
            return false;
        case 'object':
            if (a === null) {
                return b !== null;
            } else if (typeof b !== 'object' || b === null) {
                return false
            } else {
                for (let key in a) {
                    if (b.hasOwnProperty(key)) {
                        if (changed(a[key], b[key])) return true
                    } else return true;
                }
                for (let key in b) {
                    if (!a.hasOwnProperty(key)) return true;
                }
                return false;
            }
    }
}

function updateContents(path, state, method, responseStatus, responseContent, contents, entityId) {
    //TODO use to determine state.setChanged? const prevPropertyContent = contents[entityId];
    switch (responseStatus) {
        case 200:
            if ((method === 'PATCH' || method === 'PUT' || method === 'POST') && responseContent === null) {
                const content = json.get(responseContent, path, null);
                contents[entityId] = json.set(contents[entityId], path, content, null);
            } else if (method === 'GET') {
                if (typeof responseContent !== 'undefined') contents[entityId] = responseContent;
            } else if (method === 'DELETE') {
                if (path.length === 0) state.setRemoved();
                else state.setChanged();
                json.unset(contents[entityId], path, null);
                if (path.length === 0) delete contents[entityId];
            }
            //console.log('UPDATE', responseContent, requestContent, path);

            /*
            if (changed(prevPropertyContent, responseContent) && typeof responseContent !== 'undefined') {
                state.setChanged();
            }

                contents[entityId] = requestContent;
            } else {
                contents[entityId] = responseContent;
            }*/
            break;
        case 400:
            //TODO check if error is new eg compare with current error in errors
            state.setError(400, responseContent || 'Bad request');
            break;
        case 403:
            //TODO check if error is new eg compare with current error in errors
            state.setError(403, responseContent || 'Forbidden');
            break;
        case 404:
            //TODO check if error is new eg compare with current error in errors
            state.setError(404, responseContent || 'Not found');
            break;
        default:
            //state.setError(); // TODO compare with current error in errors
            throw new Error('Unsupported status ' + responseStatus);
    }
}


exports.handlePrimitive = (element, contents, statusses) => (path, method, entityId, responseStatus, responseContent, requestContent) => {
    if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
    if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');

    const state = new State(method);

    if (contents.hasOwnProperty(entityId)) {
        updateContents(path, state, method, responseStatus, responseContent, contents, entityId);
    } else if (entityId === '*') {
        for (let entityId in contents) {
            updateContents(path, state, method, responseStatus, responseContent, contents, entityId);
        }
    } else { // if 200 then changed else error
        switch (responseStatus) {
            case 200:
                if (typeof responseContent !== 'undefined') {
                    state.setChanged(); // TODO if new array value then Created
                    // for post and put methods, if no responseContent is returned, use the the requestContent instead
                    if ((method === 'PUT' || method === 'POST' || method === 'PATCH') && responseContent === null) {
                        contents[entityId] = requestContent;
                    } else {
                        contents[entityId] = responseContent;
                    }
                    if (method === 'DELETE') {
                        if (path.length === 0) state.setRemoved();
                        else state.setChanged();
                    }
                }
                break;
            case 400:
                //TODO use message frop source if available
                // TODO check if error is new eg compare with current error in errors
                state.setError(400, 'Bad Request');
                break;
            case 403:
                //TODO use message frop source if available
                // TODO check if error is new eg compare with current error in errors
                state.setError(403, 'Forbidden');
                break;
            case 404:
                //TODO use message frop source if available
                // TODO check if error is new eg compare with current error in errors
                state.setError(404, 'Not found');
                break;
            default:
                //state.setError(); TODO compare with current error in errors
                throw new Error('Unsupported status ' + responseStatus);
        }
    }
    statusses[entityId] = state.getStatus();
    element.callListeners(state, entityId, method);
    return state;
};

exports.handle = (element, statusses, subProperties, entities) => (path, method, entityId, responseStatus, responseContent, requestContent) => {
    if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
    if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');

    const state = new State(method);

    if (entities) { // only for entity
        if (!entities.hasOwnProperty(entityId)) state.setCreated();
        entities[entityId] = true; //TODO hier moet meer mee
    }

    if (responseStatus === 207) {
        for (let subPropertyName in subProperties) {
            if (responseContent.hasOwnProperty(subPropertyName)) {
                const subProperty207Wrapper = responseContent[subPropertyName];
                if (subProperty207Wrapper === null || typeof subProperty207Wrapper !== 'object'
                    || !subProperty207Wrapper.hasOwnProperty('status')
                    || !subProperty207Wrapper.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const subStatus = subProperty207Wrapper.status;
                    const subResponseContent = subProperty207Wrapper.content;

                    const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[subPropertyName] : null;
                    const subPath = path.slice(1);
                    const subProperty = subProperties[subPropertyName];
                    const subState = subProperty.handleInput(subPath, method, entityId, subStatus, subResponseContent, subRequestContent);
                    state.addSubState(subState);
                }
            }
        }
    } else {
        for (let subPropertyName in subProperties) {
            if (responseContent !== null && typeof responseContent === 'object' && responseContent.hasOwnProperty(subPropertyName)) {
                const subResponseContent = responseContent[subPropertyName];
                const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[subPropertyName] : null;
                const subPath = path.slice(1);
                const subProperty = subProperties[subPropertyName];
                const subState = subProperty.handleInput(subPath, method, entityId, responseStatus, subResponseContent, subRequestContent);
                state.addSubState(subState);
            }
        }
    }
    statusses[entityId] = state.getStatus();
    element.callListeners(state, entityId);
    return state;
};