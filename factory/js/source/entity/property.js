const types = require('../../build/types.js');
const listener = require('./listener.js');
const response = require('./response.js');
const render = require('../render/render.js');
const input = require('../request/input.js');

const validateSubPropertyPath = (types) => (type, subPropertyPath) => {
    if (!types.hasOwnProperty(type)) return false;
    if (typeof types[type].validateSubPropertyPath !== 'function') return false;
    return types[type].validateSubPropertyPath(subPropertyPath);
};

exports.constructor = function Property(xyz, parent, propertyName, meta) {
    listener.Handler.call(this);

    const subProperties = {};
    const contents = {};
    const errors = {};//TODO
    const statusses = {};//TODO

    const type = meta.type;
    //TODO handle type alliasses?
    const settings = meta; //TODO check if object

    let isPrimitive = true;
    if (settings.hasOwnProperty('signature')) {
        isPrimitive = false;
        for (let subPropertyName in settings.signature) {
            subProperties[subPropertyName] = new Property(xyz, this, subPropertyName, settings.signature[subPropertyName]);
        }
    }
    this.getStatus = entityId => {
        if (isPrimitive) return statusses[entityId];
        let status;
        for (let subPropertyName in subProperties) {
            const subStatus = subProperties[subPropertyName].getStatus(entityId);
            if (typeof status === 'undefined') {
                status = subStatus;
            } else if (status !== subStatus) {
                return 207;
            }
        }
        return status;
    };

    this.getContent = entityId => {
        if (isPrimitive) return contents[entityId];
        const content = {};
        for (let subPropertyName in subProperties) {
            content[subPropertyName] = subProperties[subPropertyName].getContent(entityId);
        }
        return content;
    };

    this.getSettings = () => settings;

    this.getUri = entityId => parent.getUri(entityId) + '/' + propertyName;

    this.getEntityClassName = () => parent.getEntityClassName();

    this.getParent = () => parent;

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

    this.handleInput = isPrimitive
        ? input.handlePrimitive(this, contents, statusses, subProperties)
        : input.handle(this, statusses, subProperties);

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

    this.createCreator = (options, data, INPUT_submit) => {
        const TRs = [];
        if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
            const uri = this.getUri('$new');
            return render.creator(xyz, options, uri, settings, [propertyName], data, INPUT_submit);
        } else if (!isPrimitive) {
            for (let propertyName in subProperties) {
                data[propertyName] = {};
                TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName], INPUT_submit));
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
            if (types.hasOwnProperty(type) && typeof types[type].getIdFromContent === 'function') {
                return types[type].getIdFromContent(data)
            } else if (settings.hasOwnProperty('connector')) {
                if (settings.connector.key === 'key' || settings.connector.key === 'basename') {
                    return data;
                }
            }
            return null;
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
        const hasRenderMethod = types.hasOwnProperty(type) && types[type].hasOwnProperty(action);
        if (isPrimitive || hasRenderMethod) {
            const uri = this.getUri(entityId);
            const content = this.getContent(entityId);
            const status = this.getStatus(entityId);
            const TAG = render.element(xyz, action, uri, [], status, content, settings, options);
            return TAG;
        } else {
            const DIV = document.createElement('DIV');
            for (let subPropertyName in subProperties) {
                const TAG = subProperties[subPropertyName].render(action, options, entityId);
                DIV.appendChild(TAG);
            }
            return DIV;
        }
    };
};