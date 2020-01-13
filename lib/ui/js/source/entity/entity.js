const Property = require('./property.js').constructor;
const Response = require('../response/response.js').constructor;

exports.constructor = function Entity(entityClassName, meta) {
    const properties = {};

    for (let propertyName in meta) {
        properties[propertyName] = new Property(propertyName, meta[propertyName], '');
    }

    this.getSettings = () => meta;


    this.createEntityIdResponse = (entityStatus, entityContent) => {
        const entityResponse = new Response();
        if (entityStatus === 207) {
            for (let propertyName in properties) {
                const property207Wrapper = entityContent[propertyName];
                if (property207Wrapper === null || typeof property207Wrapper !== 'object'
                    || !property207Wrapper.hasOwnProperty('status')
                    || !property207Wrapper.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const property = properties[propertyName];
                    const propertyStatus = property207Wrapper.status;
                    const propertyContent = property207Wrapper.content;
                    const propertyResponse = property.createResponse(propertyStatus, propertyContent);
                    entityResponse.set(propertyName, propertyResponse)
                }
            }
        } else {
            for (let propertyName in properties) {
                const property = properties[propertyName];
                const propertyContent = (entityContent === null || typeof entityContent !== 'object')
                    ? null
                    : entityContent[propertyName];
                const propertyResponse = property.createResponse(entityStatus, propertyContent);
                entityResponse.set(propertyName, propertyResponse)
            }
        }
        return entityResponse;
    };

    this.createEntityClassResponse = (entityClassStatus, entityClassContent, entityIds) => {
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
                    const entityResponse = this.createEntityIdResponse(entityStatus, entityContent);
                    entityClassResponse.set(entityId, entityResponse)
                }
            }
        } else {
            for (let entityId of entityIds) {
                const entityContent = (entityClassContent === null || typeof entityClassContent !== 'object')
                    ? null
                    : entityClassContent[entityId];
                const entityResponse = this.createEntityIdResponse(entityClassStatus, entityContent);
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
};