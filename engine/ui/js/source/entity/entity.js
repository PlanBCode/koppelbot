const Property = require('./property.js').constructor;
const listener = require('./listener.js');
const uriTools = require('../uri/uri.js');
const State = require('./state.js').State;
const response = require('./response.js');

function EntityClass(xyz, entityClassName, settings) {
    if (typeof entityClassName !== 'string') throw new TypeError('entityClassName not a string.');

    const entities = {}; //TODO mark if entities are new or have been removed
    const statusses = {};

    listener.Handler.call(this);

    const properties = {};

    for (let propertyName in settings) {
        properties[propertyName] = new Property(xyz, this, propertyName, settings[propertyName]);
    }

    this.getSettings = () => settings;

    this.getUri = entityId => {
        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');

        return '/' + entityClassName + '/' + entityId;
    };

    const addEntityListener = (entityId, path, eventName, callback) => {
        const listeners = [];
        if (path.length === 0) {
            const listener = this.addAtomicListener(entityId, eventName, callback);
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

    this.getResponse = (path, entityId) => {
        const propertyNames = (path.length === 0 || path[0] === '*')
            ? Object.keys(properties)
            : path[0].split(',');
        const content = {};
        const subPath = path.slice(1);
        for (let propertyName of propertyNames) {
            if (properties.hasOwnProperty(propertyName)) {
                content[propertyName] = properties[propertyName].getResponse(subPath, entityId);
            } else {
                content[propertyName] = new response.Node(this, entityId, 400, null, [`${propertyName} does not exist.`]); //TODO
            }
        }
        return content;
    };

    //TODO MAYBE make private /remove
    this.getEntityClassResponse = path => {
        const entityIds = (path.length === 0 || path[0] === '*')
            ? Object.keys(entities)
            : path[0].split(',');
        const content = {};
        const subPath = path.slice(1);
        for (let entityId of entityIds) {
            if (entities.hasOwnProperty(entityId)) {
                content[entityId] = this.getResponse(subPath, entityId);
            } else {
                content[entityId] = new response.Node(this, entityId, 404, null, [`/${entityClassName}/${entityId} not found.`]); //TODO
            }
        }
        return content;
    };

    this.createCreator = (options, data, xyz) => {
        const TABLE = document.createElement('TABLE');
        for (let propertyName in properties) {
            for (let TR of properties[propertyName].createCreator(options, data, xyz)) {
                TABLE.appendChild(TR);
            }
        }
        return TABLE;
    };

    this.isAutoIncremented = () => {
        for (let propertyName in properties) {
            if (properties[propertyName].isAutoIncremented()) {
                return true;
            }
        }
        return false;
    };

    this.getIdFromContent = data => {
        if (typeof data !== 'object' || data === null) {//TODO is_object
            return null;
        }
        for (let propertyName in properties) {
            if (data.hasOwnProperty(propertyName)) {
                const id = properties[propertyName].getIdFromContent(data[propertyName]);
                if (id) {
                    return id;
                }
            }
        }
        return null;
    };

    this.callListeners = (state, entityId) => {
        this.callAtomicListeners(state, entityId, this.getResponse([], entityId))
    };

    const handleEntityIdInput = (entityId, entityStatus, entityContent) => {

        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
        if (typeof entityStatus !== 'number') throw new TypeError('entityStatus not a number.');

        let state = new State();
        if (!entities.hasOwnProperty(entityId)) {
            state.setCreated();
        }
        entities[entityId] = true; //TODO hier moet meer mee

        if (entityStatus === 207) {
            for (let propertyName in properties) {
                const property207Wrapper = entityContent[propertyName];
                if (property207Wrapper === null || typeof property207Wrapper !== 'object'
                    || !property207Wrapper.hasOwnProperty('status')
                    || !property207Wrapper.hasOwnProperty('content')
                ) {
                    //TODO response is in error
                    console.error('error response in wrong format');
                } else {
                    const property = properties[propertyName];
                    const propertyStatus = property207Wrapper.status;
                    const propertyContent = property207Wrapper.content;
                    const propertyState = property.handleInput(entityId, propertyStatus, propertyContent);
                    state.addSubState(propertyState);
                }
            }
        } else {
            for (let propertyName in properties) {
                const property = properties[propertyName];
                const propertyContent = (entityContent === null || typeof entityContent !== 'object')
                    ? null
                    : entityContent[propertyName];
                const propertyState = property.handleInput(entityId, entityStatus, propertyContent);
                state.addSubState(propertyState);
            }
        }
        statusses[entityId] = state.getStatus();
        this.callListeners(state, entityId);
        return state;
    };

    this.handleInput = (entityClassStatus, entityClassContent, entityIds) => {
        const state = new State();
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
                    const entityState = handleEntityIdInput(entityId, entityStatus, entityContent);
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
                const entityState = handleEntityIdInput(entityId, entityClassStatus, entityContent);
                state.addSubState(entityState);
            }
        }
        return state;
    };

    this.render = (action, options, entityId) => {
        //TODO get xyz here
        const DIV = document.createElement('DIV');
        for (let propertyName in properties) {
            const TAG = properties[propertyName].render(action, options, entityId);
            DIV.appendChild(TAG);
        }
        return DIV;
    };
}


const handleInput = (uri, status, content, entityClasses) => {
    const state = new State();
    //TODO check status
    try {
        content = JSON.parse(content);//TODO check
    }catch(e){
        console.error(content);
        content = {};
        state.setError(500,'Could not parse JSON');
    }

    const path = uriTools.pathFromUri(uri);
    const entityClassNameList = path[0]; // TODO error if no entityClass
    const entityIdList = path[1] || '*';
    const entityClassNames = entityClassNameList.split(',');
    if (status === 207) {
        for (let entityClassName of entityClassNames) {
            const entityClass207Wrapper = content[entityClassName];
            if (entityClass207Wrapper === null || typeof entityClass207Wrapper !== 'object'
                || !entityClass207Wrapper.hasOwnProperty('status')
                || !entityClass207Wrapper.hasOwnProperty('content')
            ) {
                console.error('error response in wrong format');//TODO
            } else {
                const entityClassStatus = entityClass207Wrapper.status;
                const entityClassContent = entityClass207Wrapper.content;
                const entityClass = entityClasses[entityClassName];
                let entityIds;
                if (entityIdList === '*') {
                    entityIds = Object.keys(entityClassContent);
                } else {
                    entityIds = entityIdList.split(',');
                }
                const entityClassState = entityClass.handleInput(entityClassStatus, entityClassContent, entityIds);
                state.addSubState(entityClassState);
            }
        }
    } else {
        for (let entityClassName of entityClassNames) {
            //TODO check if content of right form otherwise null
            const entityClassContent = content[entityClassName];
            const entityClass = entityClasses[entityClassName];
            let entityIds;
            if (entityIdList === '*') {
                entityIds = Object.keys(entityClassContent);
            } else {
                entityIds = entityIdList.split(',');
            }
            const entityClassState = entityClass.handleInput(status, entityClassContent, entityIds);
            state.addSubState(entityClassState);
        }
    }
    return state;
};

function getResponse(uri, entityClasses) {
    const path = uriTools.pathFromUri(uri);
    const entityClassNames = (path.length === 0 || path[0] === '*')
        ? Object.keys(entityClasses)
        : path[0].split(',');
    const content = {};
    const subPath = path.slice(1);
    for (let entityClassName of entityClassNames) {
        if (entityClasses.hasOwnProperty(entityClassName)) {
            content[entityClassName] = entityClasses[entityClassName].getEntityClassResponse(subPath);
        } else {
            //TODO replace null with something that has the endpoints required by Node
            content[entityClassName] = new response.Node(null, entityId, 404, null, [`/${entityClassName} not found.`]); //TODO
        }
    }
    return content;
}

exports.getResponse = getResponse;
exports.Class = EntityClass;
exports.handleInput = handleInput;