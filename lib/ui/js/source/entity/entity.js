const Property = require('./property.js').constructor;
const Response = require('../response/response.js').constructor;

exports.constructor = function Entity(entityClass, meta) {
    const properties = {};
    for (let propertyName in meta) {
        properties[propertyName] = new Property(propertyName, meta[propertyName]);
    }

    this.createResponse = (status, content) => {
        const response = new Response();
        if (status === 207) {
            for (let propertyName in properties) {//TODO check if data is of this shape
                const property = properties[propertyName];
                const subStatus = content[propertyName].status; //TODO check if data is of this shape
                const subContent = content[propertyName].content;
                const subResponse = property.createResponse(subStatus, subContent);
                response.set(propertyName, subResponse)
            }
        } else if (status === 200) {
            for (let propertyName in properties) {//TODO check if data is of this shape
                const property = properties[propertyName];
                const subContent = content[propertyName];
                const subResponse = property.createResponse(200, subContent);
                response.set(propertyName, subResponse)
            }
        } else {
            //TODO problems
        }
        return response;
    };

    this.createCreator = (options, data) => {
        const TABLE = document.createElement('TABLE');
        for (let propertyName in properties) {
            for (let TR of properties[propertyName].createCreator(options, data)) {
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
};