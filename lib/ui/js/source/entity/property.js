const Response = require('../response/response.js').constructor;
const types = require('../types/types.js').types;

exports.constructor = function Property(propertyName, meta, entityClass, parentUri) {

    const uri = parentUri + '/' + propertyName;
    let isPrimitive = true;
    let isId = false;
    const subProperties = {};
    const type = meta.type;
    //TODO handle type alliasses?
    const settings = meta; //TODO check if object
    if (settings.hasOwnProperty('storage')) {
        if (settings.storage.key) {
            isId = true;
        }
    }
    if (settings.hasOwnProperty('signature')) {
        isPrimitive = false;
        for (let propertyName in settings.signature) {
            subProperties[propertyName] = new Property(propertyName, settings.signature[propertyName], uri);
        }
    }
    this.getSettings = () => settings;
    this.getUri = (entityId) => '/' + entityClass + '/' + entityId + '/' + uri;

    this.createResponse = (status, content) => {
        const response = new Response();
        if (isPrimitive) {
            response.setContent(status, content);
        } else if (content === null || typeof content !== 'object') {
            console.error('property content not object', content);
        } else if (status === 207) {
            for (let propertyName in subProperties) {//TODO check if data is of this shape
                const subPropertyContent = content[propertyName];
                if (subPropertyContent === null || typeof subPropertyContent !== 'object'
                    || !subPropertyContent.hasOwnProperty('status')
                    || !subPropertyContent.hasOwnProperty('content')
                ) {
                    //TODO reponse is in error
                    console.error('error response in wrong format');
                } else {
                    const subProperty = subProperties[propertyName];
                    const subStatus = subPropertyContent.status; //TODO check if data is of this shape
                    const subContent = subPropertyContent.content;
                    const subResponse = subProperty.createResponse(subStatus, subContent);
                    response.set(propertyName, subResponse)
                }
            }
        } else if (status === 200) {
            for (let propertyName in subProperties) {//TODO check if data is of this shape
                const property = subProperties[propertyName];
                const subContent = content[propertyName];
                const subResponse = property.createResponse(200, subContent);
                response.set(propertyName, subResponse)
            }
        } else {

            //TODO problems
        }
        return response;
    };

    this.createCreator = (options, data, xyz) => {
        const TRs = [];
        if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
            const uri = ''; //TODO
            const content = settings.hasOwnProperty('default') ? settings.default : null;
            // TODO html label for gebruiken
            const TR = document.createElement('TR');
            const TD_label = document.createElement('TD');
            TD_label.innerText = propertyName;
            TR.appendChild(TD_label);
            const onChange = content => {
                data[propertyName] = content;
            };
            const element = types[type].edit(xyz, uri, content, settings, options, onChange);
            const TD_content = document.createElement('TD');
            TD_content.appendChild(element);
            TR.appendChild(TD_content);
            TRs.push(TR);
        } else if (!isPrimitive) {
            for (let propertyName in subProperties) {
                data[propertyName] = {};
                TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName], xyz));
            }
        }
        return TRs;
    };

    this.getIdFromContent = data => {
        if (isPrimitive) {
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

    // transformation =  (Response, Property, entityId) => transformedContent
    this.transform = (propertySource, transformation, entityId) => {
        const propertyTarget = new Response();
        if (isPrimitive) {
            //TODO
            const transformedContent = transformation(propertySource, this, entityId);
            propertyTarget.setContent(propertySource.getStatus(), transformedContent);
        } else {
            for (let subPropertyName of propertySource.keys()) {
                if (subProperties.hasOwnProperty(subPropertyName)) {
                    const subProperty = subProperties[subPropertyName];
                    const subPropertyTarget = subProperty.transform(propertySource.get(subPropertyName), transformation, entityId);
                    propertyTarget.set(subPropertyName, subPropertyTarget);
                } else {
                    console.error('entity transform: property does not exist');
                    //TODO error
                }
            }
        }
        return propertyTarget;
    };
};