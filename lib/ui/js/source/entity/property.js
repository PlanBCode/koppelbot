const Response = require('../response/response.js').constructor;
const types = require('../../build/types.js');
const listener = require('./listener.js');

exports.constructor = function Property(parent, propertyName, meta) {
    listener.Handler.call(this);

    const subProperties = {};
    const contents = {};
    const statusses = {}
    const type = meta.type;
    //TODO handle type alliasses?
    const settings = meta; //TODO check if object
    let isId = false;
    if (settings.hasOwnProperty('storage')) {
        if (settings.storage.key === 'key' || settings.storage.key === 'basename') {
            isId = true;
        }
    }
    let isPrimitive = true;
    if (settings.hasOwnProperty('signature')) {
        isPrimitive = false;
        for (let propertyName in settings.signature) {
            subProperties[propertyName] = new Property(this, propertyName, settings.signature[propertyName]);
        }
    }

    this.getSettings = () => settings;

    this.getUri = entityId => parent.getUri(entityId) + '/' + propertyName;

   /* //TODO this.getStatus = (path, entityId) => {}

    this.getContent = (path, entityId) => {
        if (isPrimitive) {
            return contents[entityId];
        } else {
            const subPropertyNameList = path[0];
            const subPropertyNames = (typeof subPropertyNameList === 'undefined' || subPropertyNameList === '*')
                ? Object.keys(subProperties)
                : subPropertyNameList.split(',');
            const content = {};
            const subPath = path.slice(1);
            for(let subPropertyName of subPropertyNames){
                if(subProperties.hasOwnProperty(subPropertyName)) {
                    const subContent = subProperties[subPropertyName].getContent(subPath, entityId);
                    content[subPropertyName] = subContent;
                }else{
                    //TODO error
                }
            }
            return content;
        }
    };*/

    this.handleInput = (entityId, propertyStatus, propertyContent) => {
        const prevStatus = statusses[entityId];
        let status;
        if (isPrimitive) {
            if (contents.hasOwnProperty(entityId)) {
                const prevPropertyContent = contents[entityId];
                switch (propertyStatus) {
                    case 200:
                        status = prevPropertyContent === propertyContent ? 200 : 304;
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        status = 404;
                        break;
                    default:
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            } else { // if 200 then created, else error
                switch (propertyStatus) {
                    case 200:
                        status = 201;
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        status = 404;
                        break;
                    default:
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
                    const subStatusOut = subProperty.handleInput(entityId, subStatus, subContent);
                    status = listener.combineStatus(status,subStatusOut);
                }
            }
        } else {
            for (let subPropertyName in subProperties) {
                const subProperty = subProperties[subPropertyName];
                const subPropertyContent = (propertyContent === null || typeof propertyContent !== 'object')
                    ? null
                    : propertyContent[subPropertyName];
                const subStatusOut = subProperty.handleInput(entityId, propertyStatus, subPropertyContent);
                status = listener.combineStatus(status,subStatusOut);
            }
        }
        //TODO this.callListeners(entityId, propertyResponse, isDelta);
        statusses[entityId] = status;
        return status;
    };

    this.createResponse = (entityId, propertyStatus, propertyContent, isDelta) => {
        const propertyResponse = new Response();
        const prevStatus = statusses[entityId];
        if (isPrimitive) {
            if (contents.hasOwnProperty(entityId)) {
                const prevPropertyContent = contents[entityId];
                switch (propertyStatus) {
                    case 200:
                        propertyStatus = prevPropertyContent === propertyContent ? 200 : 304;
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        break;
                    default:
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            } else { // if 200 then created, else error
                switch (propertyStatus) {
                    case 200:
                        propertyStatus = 201;
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        break;
                    default:
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            }
            statusses[entityId] = propertyStatus;
            propertyResponse.setContent(propertyStatus, propertyContent);
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
                    const subResponse = subProperty.createResponse(entityId, subStatus, subContent, isDelta);
                    propertyResponse.set(subPropertyName, subResponse)
                }
            }
        } else {
            for (let subPropertyName in subProperties) {
                const subProperty = subProperties[subPropertyName];
                const subPropertyContent = (propertyContent === null || typeof propertyContent !== 'object')
                    ? null
                    : propertyContent[subPropertyName];
                const subPropertyResponse = subProperty.createResponse(entityId, propertyStatus, subPropertyContent, isDelta);
                propertyResponse.set(subPropertyName, subPropertyResponse)
            }
        }
        this.callListeners(entityId, propertyResponse, isDelta);
        return propertyResponse;
    };

    this.createCreator = (options, data, xyz) => {
        const TRs = [];
        if (types.hasOwnProperty(type) && types[type].hasOwnProperty('edit')) {
            if (type === 'id') {
                return TRs;
            }
            const uri = this.getUri('*'); //TODO double check this
            const content = settings.hasOwnProperty('default') ? settings.default : null;
            // TODO html label for gebruiken
            const TR = document.createElement('TR');
            const TD_label = document.createElement('TD');
            TD_label.innerText = propertyName;
            TR.appendChild(TD_label);
            const onChange = content => {
                data[propertyName] = content;
            };
            const element = types[type].edit(xyz, uri, 200, content, settings, options, onChange);
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

    this.isAutoIncremented = () => {
        if (isPrimitive) {
            return type === 'id';
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