const Property = require('./property.js').constructor;
const listener = require('./listener.js');
const uriTools = require('../uri/uri.js');
const State = require('./state.js').State;
const response = require('./response.js');
const input = require('../request/input.js');

function compileSettings(rawSettings) {
    const settings = {};
    const rootSettings = rawSettings.hasOwnProperty('_') ? rawSettings['_'] : {};
    for (let propertyName in rawSettings) {
        if (propertyName !== '_') {
            settings[propertyName] = {...rootSettings};
            for (let id in rawSettings[propertyName]) {
                if ((id === 'access' || id === 'connector') && rootSettings.hasOwnProperty(id)) {
                    settings[propertyName][id] = {...rootSettings[id], ...rawSettings[propertyName][id]};
                } else {
                    settings[propertyName][id] = rawSettings[propertyName][id];
                }
            }
        }
    }
    return settings;
}

function EntityClass(xyz, entityClassName, rawSettings) {

    const settings = compileSettings(rawSettings);

    if (typeof entityClassName !== 'string') throw new TypeError('entityClassName not a string.');

    const entities = {}; //TODO mark if entities are new or have been removed
    const statusses = {};

    listener.Handler.call(this);

    const properties = {};

    for (let propertyName in settings) {
        properties[propertyName] = new Property(xyz, this, propertyName, settings[propertyName]);
    }

    this.getSettings = () => settings;

    this.getEntityClassName = () => entityClassName;

    this.getUri = entityId => {
        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
        return '/' + entityClassName + '/' + entityId;
    };

    const addEntityListener = (entityId, path, eventName, callback) => {
        const listeners = [];
        if (path.length === 0) {
            const listener = this.addAtomicListener(entityId, eventName, callback, '', entities);
            listeners.push(listener);
        } else {
            const propertNameList = path[0];
            const propertyNames = propertNameList === '*'
                ? Object.keys(properties)
                : propertNameList.split(',');
            const subPath = path.slice(1);
            for (let propertyName of propertyNames) {
                if (properties.hasOwnProperty(propertyName)) {
                    const propertyListeners = properties[propertyName].addPropertyListener(entityId, subPath, eventName, callback);
                    listeners.push(...propertyListeners);
                } else {
                    //TODO throw error?
                    console.error(subPropertyName + 'not available')
                }
            }
        }
        return listeners;
    };

    this.addListener = (path, eventName, callback) => {
        //TODO check path, callback and eventName
        // TODO only if path.length <= 1 ? otherwise send to properties
        const listeners = [];
        const entityIds = (path.length === 0 || path[0] === '*')
            ? ['*']
            : path[0].split(',');
        const subPath = path.splice(1);
        for (let entityId of entityIds) {
            const entityListeners = addEntityListener(entityId, subPath, eventName, callback);
            listeners.push(...entityListeners);
        }
        return listeners;
    };

    this.getResponse = (path, entityId, method) => {
        const propertyNames = (path.length === 0 || path[0] === '*')
            ? Object.keys(properties)
            : path[0].split(',');
        const content = {};
        const subPath = path.slice(1);
        for (let propertyName of propertyNames) {
            if (properties.hasOwnProperty(propertyName)) {
                content[propertyName] = properties[propertyName].getResponse(subPath, entityId, method);
            } else {
                content[propertyName] = new response.Node(this, entityId, 400, null, [`${propertyName} does not exist.`], method); //TODO
            }
        }
        return content;
    };

    //TODO MAYBE make private /remove
    this.getEntityClassResponse = (path, method) => {
        const entityIds = (path.length === 0 || path[0] === '*')
            ? Object.keys(entities)
            : path[0].split(',');
        const content = {};
        const subPath = path.slice(1);
        for (let entityId of entityIds) {
            if (entities.hasOwnProperty(entityId)) {
                content[entityId] = this.getResponse(subPath, entityId, method);
            } else {
                content[entityId] = new response.Node(this, entityId, 404, null, [`/${entityClassName}/${entityId} not found.`], method); //TODO
            }
        }
        return content;
    };

    this.createCreator = (options, data, INPUT_submit) => {
        const TABLE = document.createElement('TABLE');
        TABLE.classList.add('xyz-create');
        if (options.showHeader !== false) {
            const TR_header = document.createElement('TR');
            TR_header.classList.add('xyz-create-header');
            const TD_header = document.createElement('TD');
            TD_header.setAttribute('colspan', '2');
            TR_header.appendChild(TD_header);
            TABLE.appendChild(TR_header);
            TD_header.innerText = 'New ' + entityClassName;
        }
        for (let propertyName in properties) {
            for (let TR of properties[propertyName].createCreator(options, data, INPUT_submit)) {
                TABLE.appendChild(TR);
            }
        }
        return TABLE;
    };

    this.getTitlePropertyPath = () => {
        for (let propertyName in properties) {
            const titlePropertyPath = properties[propertyName].getTitlePropertyPath();
            if (titlePropertyPath !== null) return [propertyName].concat(titlePropertyPath);
        }
        return null;
    };

    this.getDisplayName = propertyPath => {
        if (!(propertyPath instanceof Array) || propertyPath.length === 0) {
            return entityClassName; //TODO also add option to $entity.json for a display name
        } else if (properties.hasOwnProperty(propertyPath[0])) {
            return properties[propertyPath[0]].getDisplayName(propertyPath.slice(1));
        } else {
            return 'Unknown';
        }
    };

    this.isAutoIncremented = () => {
        for (let propertyName in properties) {
            if (properties[propertyName].isAutoIncremented()) return true;
        }
        return false;
    };

    this.getIdProperty = () => {
        for (let propertyName in properties) {
            const property = properties[propertyName];
            if (property.isId()) return propertyName;
        }
        return null;
    };

    this.getIdPropertyPath = () => {
        for (let propertyName in properties) {
            const possibleIdProperty = properties[propertyName].getIdPropertyPath();
            if (possibleIdProperty instanceof Array) return possibleIdProperty;
        }
        return null;
    };


    this.getIdFromContent = data => {
        if (typeof data !== 'object' || data === null) {//TODO is_object
            return null;
        }
        for (let propertyName in properties) {
            if (data.hasOwnProperty(propertyName)) {
                const id = properties[propertyName].getIdFromContent(data[propertyName]);
                if (id) return id;
            }
        }
        return null;
    };

    this.callListeners = (state, entityId) => {
        this.callAtomicListeners(state, entityId, this.getResponse([], entityId, state.getMethod()))
    };

    const handleEntityIdInput = input.handle(this, statusses, properties, entities);

    this.handleInput = (path, method, entityClassStatus, entityClassContent, requestContent, entityIds) => {
        const state = new State(method);
        if (entityClassStatus === 207) {
            for (let entityId of entityIds) {
                const entity207Wrapper = entityClassContent[entityId];
                if (entity207Wrapper === null || typeof entity207Wrapper !== 'object'
                    || !entity207Wrapper.hasOwnProperty('status')
                    || !entity207Wrapper.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const entityStatus = entity207Wrapper.status;
                    const entityContent = entity207Wrapper.content;
                    const requestEntityId = method === 'POST' ? 'new' : entityId; // for POST the request is done with new TODO fix for multiple
                    const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[requestEntityId] : null;
                    const subPath = path.slice(1);
                    const entityState = handleEntityIdInput(subPath, method, entityId, entityStatus, entityContent, subRequestContent);
                    state.addSubState(entityState);
                }
            }
        } else {
            //TODO if error set error
            //            state.setError(404, 'Not found');
            for (let entityId of entityIds) {
                const entityContent = (entityClassContent === null || typeof entityClassContent !== 'object')
                    ? null
                    : entityClassContent[entityId];
                const requestEntityId = method === 'POST' ? 'new' : entityId; // for POST the request is done with new TODO fix for multiple
                const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[requestEntityId] : null;
                const subPath = path.slice(1);
                const entityState = handleEntityIdInput(subPath, method, entityId, entityClassStatus, entityContent, subRequestContent);
                state.addSubState(entityState);
            }
        }
        return state;
    };

    this.getSubObject = propertyName => properties[propertyName];

    this.render = (action, options, entityId, subPath) => {
        let propertyNames;
        if (typeof subPath === 'undefined' || subPath[0] === '*') {
            propertyNames = Object.keys(properties)
        } else {
            propertyNames = subPath[0].split(',');
        }
        const DIV = document.createElement('DIV');
        for (let propertyName of propertyNames) {
            if(properties.hasOwnProperty(propertyName)) {
                const TAG = properties[propertyName].render(action, options, entityId);
                DIV.appendChild(TAG);
            }else{
                //TODO error?
            }
        }
        return DIV;
    };

    this.checkAccess = (propertyPath, method, groups) => {
        if (propertyPath.length === 0) {
            const idPropertyPath = this.getIdPropertyPath();
            if (idPropertyPath instanceof Array && idPropertyPath.length > 0) {
                return properties[idPropertyPath[0]].checkAccess([], method, groups);
            }
            return false;
        } else {
            const subPropertyPath = propertyPath.slice(1);
            const propertyNames = propertyPath[0] === '*' ? Object.keys(properties) : propertyPath[0].split(',');
            for (let propertyName of propertyNames) {
                if (!properties.hasOwnProperty(propertyName)) {
                    return false;
                } else if (!properties[propertyName].checkAccess(subPropertyPath, method, groups)) {
                    return false;
                }
            }
        }
        return true;
    }
}

const handleInput = (method, uri, status, responseContent, requestContent, entityClasses) => {
    const state = new State(method);
    //TODO check status

    const path = uriTools.pathFromUri(uri);
    const entityClassNameList = path[0]; // TODO error if no entityClass
    const entityIdList = path[1] || '*';
    const entityClassNames = entityClassNameList.split(',');
    if (status === 207) {
        for (let entityClassName of entityClassNames) {
            const entityClass207Wrapper = responseContent[entityClassName];
            if (entityClass207Wrapper === null || typeof entityClass207Wrapper !== 'object'
                || !entityClass207Wrapper.hasOwnProperty('status')
                || !entityClass207Wrapper.hasOwnProperty('content')
            ) {
                console.error('error response in wrong format');//TODO
            } else {
                const entityClassStatus = entityClass207Wrapper.status;
                const entityClassContent = entityClass207Wrapper.content;
                const entityClass = entityClasses[entityClassName];
                const entityIds = (entityIdList === '*')
                    ? Object.keys(entityClassContent)
                    : entityIdList.split(',');
                const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[entityClassName] : null;
                const subPath = path.slice(1);
                const entityClassState = entityClass.handleInput(subPath, method, entityClassStatus, entityClassContent, subRequestContent, entityIds);
                state.addSubState(entityClassState);
            }
        }
    } else {
        for (let entityClassName of entityClassNames) {
            const entityClassContent = responseContent[entityClassName];
            const subRequestContent = typeof requestContent === 'object' && requestContent !== null ? requestContent[entityClassName] : null;
            const subPath = path.slice(1);
            if (entityClassContent === null || typeof entityClassContent !== 'object') {
                const entityIds = entityIdList === '*'
                    ? []
                    : entityIdList.split(',');
                const entityClass = entityClasses[entityClassName];
                const entityClassState = entityClass.handleInput(subPath, method, 404, {}, subRequestContent, entityIds);
                state.addSubState(entityClassState);
            } else {
                const entityIds = entityIdList === '*'
                    ? Object.keys(entityClassContent)
                    : entityIdList.split(',');
                const entityClass = entityClasses[entityClassName];
                const entityClassState = entityClass.handleInput(subPath, method, status, entityClassContent, subRequestContent, entityIds);
                state.addSubState(entityClassState);
            }
        }
    }
    return state;
};

function getResponse(uri, entityClasses, method) {
    const path = uriTools.pathFromUri(uri);
    const entityClassNames = (path.length === 0 || path[0] === '*')
        ? Object.keys(entityClasses)
        : path[0].split(',');
    const content = {};
    const subPath = path.slice(1);
    for (let entityClassName of entityClassNames) {
        if (entityClasses.hasOwnProperty(entityClassName)) {
            content[entityClassName] = entityClasses[entityClassName].getEntityClassResponse(subPath, method);
        } else {
            //TODO replace null with something that has the endpoints required by Node
            content[entityClassName] = new response.Node(null, '*', 404, null, [`/${entityClassName} not found.`], method); //TODO
        }
    }
    return content;
}

const isAutoIncremented = (entityClasses, entityClassName) => {
    return entityClassName === '*' || !entityClasses.hasOwnProperty(entityClassName)
        ? false
        : entityClasses[entityClassName].isAutoIncremented();
};

const getTitlePropertyPath = (entityClasses, entityClassName) => {
    return entityClasses.hasOwnProperty(entityClassName)
        ? entityClasses[entityClassName].getTitlePropertyPath()
        : null;
};

const getDisplayName = (entityClasses, entityClassName, propertyPath) => {
    return entityClasses.hasOwnProperty(entityClassName)
        ? entityClasses[entityClassName].getDisplayName(propertyPath)
        : 'Unknown';
};

// checks if user has access to given method and uri
const checkAccess = (entityClasses, uri, method) => {
    const groups = ['/group/guest'];
    if (entityClasses.hasOwnProperty('session')) {
        const response = getResponse('/session/*/groups', entityClasses, 'GET');
        if (response.hasOwnProperty('session')) {
            for (let sessionId in response.session) {
                const session = response.session[sessionId];
                const sessionGroups = session.groups;
                if (!sessionGroups.hasErrors()) {
                    const g = sessionGroups.getContent();
                    if (g instanceof Array) {
                        groups.push.apply(groups, sessionGroups.getContent());
                    }
                }
            }
        }
        //TODO make groups unique
    }
    const entityClassNames = uriTools.getEntityClassNames(uri, entityClasses);
    const subPath = uriTools.pathFromUri(uri).slice(2);
    for (let entityClassName of entityClassNames) {
        if (!entityClasses.hasOwnProperty(entityClassName) ||
            !entityClasses[entityClassName].checkAccess(subPath, method, groups)) return false;
    }
    return true;
}

exports.isAutoIncremented = isAutoIncremented;
exports.getTitlePropertyPath = getTitlePropertyPath;
exports.getDisplayName = getDisplayName;
exports.checkAccess = checkAccess;

exports.getResponse = getResponse;
exports.Class = EntityClass;
exports.handleInput = handleInput;