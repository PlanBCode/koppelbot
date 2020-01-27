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
                    } else {
                        return true;
                    }
                }
                for (let key in b) {
                    if (!a.hasOwnProperty(key)) {
                        return true;
                    }
                }
                return false;
            }
    }
}


exports.handlePrimitive = (element, contents, statusses) => (method, entityId, responseStatus, responseContent, requestContent) => {
    if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
    if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');

    const state = new State(method);

    if (contents.hasOwnProperty(entityId)) {
        const prevPropertyContent = contents[entityId];
        switch (responseStatus) {
            case 200:
                if (changed(prevPropertyContent, responseContent) && typeof responseContent !== 'undefined') {
                    state.setChanged();
                }
                if ((method === 'PATCH' || method === 'PUT' || method === 'POST') && responseContent === null) {
                    contents[entityId] = requestContent;
                } else {
                    contents[entityId] = responseContent;
                }
                break;
            case 404:
                //TODO use message frop source if available
                //TODO check if error is new eg compare with current error in errors
                state.setError(404, 'Not found');
                break;
            default:
                //state.setError(); // TODO compare with current error in errors
                throw new Error('Unsupported status ' + responseStatus);
        }
    } else { // if 200 then changed else error
        switch (responseStatus) {
            case 200:
                if (typeof responseContent !== 'undefined') {
                    state.setChanged(); // TODO if new array value then Created
                    // for post and put methods, if no responseContent is returned, use the the requestContent instead
                    if ((method === 'PUT' || method === 'POST') && responseContent === null) {
                        contents[entityId] = requestContent;
                    } else {
                        contents[entityId] = responseContent;
                    }
                }
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
    element.callListeners(state, entityId);
    return state;
};

exports.handle = (element, statusses, subProperties, entities) => (method, entityId, responseStatus, responseContent, requestContent) => {
    if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
    if (typeof responseStatus !== 'number') throw new TypeError('responseStatus not a number.');

    const state = new State(method);

    if (entities) { // only for entity
        if (!entities.hasOwnProperty(entityId)) {
            state.setCreated();
        }
        entities[entityId] = true; //TODO hier moet meer mee
    }

    if (responseStatus === 207) {
        for (let subPropertyName in subProperties) {
            const subProperty207Wrapper = responseContent[subPropertyName];
            if (subProperty207Wrapper === null || typeof subProperty207Wrapper !== 'object'
                || !subProperty207Wrapper.hasOwnProperty('status')
                || !subProperty207Wrapper.hasOwnProperty('content')
            ) {
                //TODO reponse is in error
                console.error('error response in wrong format');
            } else {
                const subProperty = subProperties[subPropertyName];
                const subStatus = subProperty207Wrapper.status;
                const subResponseContent = subProperty207Wrapper.content;
                const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[subPropertyName] : null;
                const subState = subProperty.handleInput(method, entityId, subStatus, subResponseContent, subRequestContent);
                state.addSubState(subState);
            }
        }
    } else {
        for (let subPropertyName in subProperties) {
            const subProperty = subProperties[subPropertyName];
            const subResponseContent = (responseContent === null || typeof responseContent !== 'object')
                ? null
                : responseContent[subPropertyName];
            const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[subPropertyName] : null;
            const subState = subProperty.handleInput(method, entityId, responseStatus, subResponseContent, subRequestContent);
            state.addSubState(subState);
        }
    }
    statusses[entityId] = state.getStatus();
    element.callListeners(state, entityId);
    return state;
};