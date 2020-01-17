const Property = require('./property.js').constructor;
const Response = require('../response/response.js').constructor;
const listener = require('./listener.js');
const uriTools = require('../uri/uri.js');
const State = require('./state.js').State;
const response = require('./response.js');

function EntityClass(entityClassName, settings) {
    if (typeof entityClassName !== 'string') throw new TypeError('entityClassName not a string.');

    const entities = {}; //TODO mark if entities are new or have been removed

    listener.Handler.call(this);

    const properties = {};

    for (let propertyName in settings) {
        properties[propertyName] = new Property(this, propertyName, settings[propertyName]);
    }

    this.getSettings = () => settings;

    this.getUri = entityId => {
        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');

        return '/' + entityClassName + '/' + entityId;
    };

    this.addListener = (path, eventName, callback) => {
        //TODO check path, callback and uri
        // TODO only if path.length <= 1 ? otherwise send to properties
        const entityIds = (path.length === 0 || path[0] === '*')
            ? ['*']
            : entityIds.split('.');
        for (let entityId of entityIds) {
            this.addEntityIdListener(entityId, eventName, callback);
        }
    };

    //TODO MAYBE make private / remove
    this.getEntityIdResponse = (path, entityId) => {
        const propertyNames = (path.length === 0 || path[0] === '*')
            ? Object.keys(properties)
            : path[0].split(',');
        const response = {};
        const subPath = path.slice(1);
        for (let propertyName of propertyNames) {
            if (properties.hasOwnProperty(propertyName)) {
                response[propertyName] = properties[propertyName].getResponse(subPath, entityId);
            } else {
                response[propertyName] = new response.Node(400, null, [`${propertyName} does not exist.`]); //TODO
            }
        }
        return response;
    };

    //TODO MAYBE make private /remove
    this.getResponse = path => {
        const entityIds = (path.length === 0 || path[0] === '*')
            ? Object.keys(entities)
            : path[0].split(',');
        const response = {};
        const subPath = path.slice(1);
        for (let entityId of entityIds) {
            if (entities.hasOwnProperty(entityId)) {
                response[entityId] = this.getEntityIdResponse(subPath, entityId);
            } else {
                response[entityId] = new response.Node(404, null, [`/${entityClassName}/${entityId} not found.`]); //TODO
            }
        }
        return response;
    };

    this.createEntityIdResponse = (entityId, entityStatus, entityContent, isDelta) => {
        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
        if (typeof entityStatus !== 'number') throw new TypeError('entityStatus not a number.');

        const entityResponse = new Response();
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
                    const propertyResponse = property.createResponse(entityId, propertyStatus, propertyContent, isDelta);
                    entityResponse.set(propertyName, propertyResponse);
                }
            }
        } else {
            for (let propertyName in properties) {
                const property = properties[propertyName];
                const propertyContent = (entityContent === null || typeof entityContent !== 'object')
                    ? null
                    : entityContent[propertyName];
                const propertyResponse = property.createResponse(entityId, entityStatus, propertyContent, isDelta);
                entityResponse.set(propertyName, propertyResponse)
            }
        }
        //TOD this.callListeners(entityId, entityResponse, isDelta);
        return entityResponse;
    };

    this.createEntityClassResponse = (entityClassStatus, entityClassContent, entityIds, isDelta) => {
        const entityClassResponse = new Response();

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
                    const entityResponse = this.createEntityIdResponse(entityId, entityStatus, entityContent, isDelta);
                    entityClassResponse.set(entityId, entityResponse)
                }
            }
        } else {
            for (let entityId of entityIds) {
                const entityContent = (entityClassContent === null || typeof entityClassContent !== 'object')
                    ? null
                    : entityClassContent[entityId];
                const entityResponse = this.createEntityIdResponse(entityId, entityClassStatus, entityContent, isDelta);
                entityClassResponse.set(entityId, entityResponse)
            }
        }
        return entityClassResponse;
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

    this.transform = (entityClassSource, transformation) => {
        const entityClassTarget = new Response();
        for (let entityId of entityClassSource.keys()) {
            const entitySource = entityClassSource.get(entityId);
            const entityTarget = new Response();
            for (let propertyName of entitySource.keys()) {
                if (properties.hasOwnProperty(propertyName)) {
                    const property = properties[propertyName];
                    const subTarget = property.transform(entitySource.get(propertyName), transformation, entityId);
                    entityTarget.set(propertyName, subTarget);
                } else {
                    console.error('entity transform: property does not exist');
                    //TODO error
                }
            }
            entityClassTarget.set(entityId, entityTarget);
        }
        return entityClassTarget;
    };

    const handleEntityIdInput = (entityId, entityStatus, entityContent) => {

        if (typeof entityId !== 'string') throw new TypeError('entityId not a string.');
        if (typeof entityStatus !== 'number') throw new TypeError('entityStatus not a number.');

        entities[entityId] = true; //TODO hier moet meer mee
        let state = new State();
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

        this.callListeners(state, entityId, this.getEntityIdResponse([],entityId));
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
}


const handleInput = (uri, status, content, entityClasses) => {
    //TODO check status
    content = JSON.parse(content);//TODO check

    const state = new State();
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
    const response = {};
    const subPath = path.slice(1);
    for (let entityClassName of entityClassNames) {
        if (entityClasses.hasOwnProperty(entityClassName)) {
            response[entityClassName] = entityClasses[entityClassName].getResponse(subPath);
        } else {
            response[entityClassName] = new response.Node(404, null, [`/${entityClassName} not found.`]); //TODO
        }
    }
    return response;
}

exports.getResponse = getResponse;
exports.Class = EntityClass;
exports.handleInput = handleInput;