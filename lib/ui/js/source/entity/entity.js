const Property = require('./property.js').constructor;
const Response = require('../response/response.js').constructor;

exports.constructor = function Entity(entityClassName, meta) {
    const properties = {};

    for (let propertyName in meta) {
        properties[propertyName] = new Property(propertyName, meta[propertyName], '');
    }

    this.getSettings = () => meta;

    this.createResponse = (status, content) => {
        const response = new Response();
        if (content === null || typeof content !== 'object') {
            console.error('entity content not object', content);
            //response.setContent(status, content); //TODO not sure if this is correct
        } else if (status === 207) {
            for (let propertyName in properties) {
                const propertyContent = content[propertyName];
                if (propertyContent === null || typeof propertyContent !== 'object'
                    || !propertyContent.hasOwnProperty('status')
                    || !propertyContent.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const property = properties[propertyName];
                    const subStatus = propertyContent.status; //TODO check if data is of this shape
                    const subContent = propertyContent.content;
                    const subResponse = property.createResponse(subStatus, subContent);
                    response.set(propertyName, subResponse)
                }
            }
        } else if (status === 200) {
            for (let propertyName in properties) {
                const property = properties[propertyName];
                const subContent = content[propertyName];
                const subResponse = property.createResponse(200, subContent);
                response.set(propertyName, subResponse)
            }
        } else {
            console.error('status', status);
            //TODO problems
        }
        return response;
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