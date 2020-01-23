const types = require('../../build/types.js');
const listener = require('./listener.js');
const State = require('./state.js').State;
const response = require('./response.js');
const render = require('../render/render.js');
const Item = require('../render/item.js').constructor;

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

const validateSubPropertyPath = (types) => (type, subPropertyPath) => {
    if (!types.hasOwnProperty(type)) return false;
    if (typeof types[type].validateSubPropertyPath !== 'function') return false;
    return types[type].validateSubPropertyPath(subPropertyPath);
}

exports.constructor = function Property(xyz, parent, propertyName, meta) {
    listener.Handler.call(this);

    const subProperties = {};
    const contents = {};
    const errors = {};//TODO
    const statusses = {};//TODO

    const type = meta.type;
    //TODO handle type alliasses?
    const settings = meta; //TODO check if object
    let isId = false;
    if (settings.hasOwnProperty('storage')) {
        if (settings.storage.key === 'key' || settings.storage.key === 'basename' || settings.type === 'id') {
            isId = true;
        }
    }
    let isPrimitive = true;
    if (settings.hasOwnProperty('signature')) {
        isPrimitive = false;
        for (let subPropertyName in settings.signature) {
            subProperties[subPropertyName] = new Property(xyz, this, subPropertyName, settings.signature[subPropertyName]);
        }
    }

    this.getSettings = () => settings;

    this.getUri = entityId => parent.getUri(entityId) + '/' + propertyName;

    this.getEntityClassName = () => parent.getEntityClassName();

    this.getResponse = (path, entityId, method) => {
        if (isPrimitive) {
            return new response.Node(this, entityId, statusses[entityId], contents[entityId], errors[entityId], method);
        } else {
            const subPropertyNames = (path.length === 0 || path[0] === '*')
                ? Object.keys(subProperties)
                : path[0].split(',');
            const content = {};
            const subPath = path.slice(1);
            for (let subPropertyName of subPropertyNames) {
                if (subProperties.hasOwnProperty(subPropertyName)) {
                    content[subPropertyName] = subProperties[subPropertyName].getResponse(subPath, entityId, method);
                } else {
                    content[subPropertyName] = new response.Node(this, entityId, 400, null, [`${subPropertyName} does not exist.`], method); //TODO
                }
            }
            return content;
        }
    };

    this.callListeners = (state, entityId) => {
        this.callAtomicListeners(state, entityId, this.getResponse([], entityId, state.getMethod()));
        parent.callListeners(state.getParentState(), entityId);
    };

    this.handleInput = (method, entityId, propertyStatus, propertyContent) => {
        const state = new State(method);
        if (isPrimitive) {
            if (contents.hasOwnProperty(entityId)) {
                const prevPropertyContent = contents[entityId];
                switch (propertyStatus) {
                    case 200:
                        if (changed(prevPropertyContent, propertyContent) && typeof propertyContent !== 'undefined') {
                            state.setChanged();
                        }
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        //TODO use message frop source if available
                        // TODO check if error is new eg compare with current error in errors
                        state.setError(404, 'Not found');
                        break;
                    default:
                        //state.setError(); // TODO compare with current error in errors
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            } else { // if 200 then changed else error
                switch (propertyStatus) {
                    case 200:
                        if (typeof propertyContent !== 'undefined') {
                            state.setChanged(); // TODO if new array value then Created
                            contents[entityId] = propertyContent;
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
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            }
        } else if (propertyStatus === 207) {
            for (let subPropertyName in subProperties) {
                const subProperty207Wrapper = propertyContent[subPropertyName];
                if (subProperty207Wrapper === null || typeof subProperty207Wrapper !== 'object'
                    || !subProperty207Wrapper.hasOwnProperty('status')
                    || !subProperty207Wrapper.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const subProperty = subProperties[subPropertyName];
                    const subStatus = subProperty207Wrapper.status;
                    const subContent = subProperty207Wrapper.content;
                    const subState = subProperty.handleInput(method, entityId, subStatus, subContent);
                    state.addSubState(subState);
                }
            }
        } else {
            for (let subPropertyName in subProperties) {
                const subProperty = subProperties[subPropertyName];
                const subPropertyContent = (propertyContent === null || typeof propertyContent !== 'object')
                    ? null
                    : propertyContent[subPropertyName];
                const subState = subProperty.handleInput(method, entityId, propertyStatus, subPropertyContent);
                state.addSubState(subState);
            }
        }
        statusses[entityId] = state.getStatus();
        this.callListeners(state, entityId);
        return state;
    };

    this.addPropertyListener = (entityId, subPropertyPath, eventName, callback) => {
        const listeners = [];
        if (subPropertyPath.length === 0) {
            const listener = this.addAtomicListener(entityId, eventName, callback);
            listeners.push(listener);
        } else if (isPrimitive) {
            if (types.hasOwnProperty(type) && types[type].hasOwnProperty('validateSubPropertyPath')) {

                if (types[type].validateSubPropertyPath(subPropertyPath, settings, validateSubPropertyPath)) {
                    const subUri = subPropertyPath.join('/');
                    const listener = this.addAtomicListener(entityId, eventName, callback, subUri);
                    listeners.push(listener);
                } else {
                    console.error('Invalid sub property path: ' + this.getUri(entityId) + '/' + subPropertyPath.join('/') + ' for type ' + type + '.');
                }
            } else {
                console.error('Invalid sub property path: ' + this.getUri(entityId) + subPropertyPath.join('/') + ' for type ' + type + '.');
            }
        } else {
            const subPropertNameList = subPropertyPath[0];
            const subPropertyNames = subPropertNameList === '*'
                ? Object.keys(properties)
                : subPropertNameList.split(',');
            const subPath = subPropertyPath.slice(1);
            for (let subPropertyName of subPropertyNames) {
                if (subProperties.hasOwnProperty(subPropertyName)) {
                    const subPropertyListeners = subProperties[subPropertyName].addPropertyListener(entityId, subPath, eventName, callback)
                    listeners.push(...subPropertyListeners);
                } else {
                    //TODO throw error?
                    console.error(subPropertyName + 'not available')
                }
            }
        }
        return listeners;
    };

    this.createCreator = (options, data) => {
        const TRs = [];
        if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
            const uri = this.getUri('$new');
            return render.creator(xyz, options, uri, settings, propertyName, data);
        } else if (!isPrimitive) {
            for (let propertyName in subProperties) {
                data[propertyName] = {};
                TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName]));
            }
        } else {
            console.error('No available rendering method for edit ' + type);
        }
        return TRs;
    };

    this.isAutoIncremented = () => {
        if (isPrimitive) {
            return type === 'id' && settings.autoIncrement === true;
        } else {
            for (let subPropertyName in subProperties) {
                if (subProperties[subPropertyName].isAutoIncremented()) {
                    return true;
                }
            }
            return false;
        }
    };

    this.getIdFromContent = data => {
        if (isPrimitive) {
            console.log('a', isId)

            return isId ? data : null;
        } else {

            if (typeof data !== 'object' || data === null) { //TODO is_object
                return null;
            }

            for (let subPropertyName in subProperties) {
                if (data.hasOwnProperty(subPropertyName)) {
                    const id = subProperties[subPropertyName].getIdFromContent(data[subPropertyName]);
                    if (id) {
                        return id;
                    }
                }
            }
            return null;
        }
    };

    this.render = (action, options, entityId) => {
        //TODO get xyz here
        if (isPrimitive) {
            const uri = this.getUri(entityId);
            const content = contents[entityId];
            const status = statusses[entityId];
            const TAG = render.element(xyz, action, uri, status, content, settings, options);
            return TAG;
        } else {
            //TODO loop through subproperties and render all
            const DIV = document.createElement('DIV');
            for (let subPropertyName in subProperties) {
                const TAG = subProperties[subPropertyName].render(action, options, entityId);
                DIV.appendChild(TAG);
            }
            return DIV;
        }
    };
};