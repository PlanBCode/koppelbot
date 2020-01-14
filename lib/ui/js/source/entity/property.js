const Response = require('../response/response.js').constructor;
const types = require('../../build/types.js');

exports.constructor = function Property(propertyName, meta, entityClass, parentUri) {

    const uri = parentUri + '/' + propertyName;
    let isPrimitive = true;
    let isId = false;
    const subProperties = {};
    const type = meta.type;
    //TODO handle type alliasses?
    const settings = meta; //TODO check if object
    if (settings.hasOwnProperty('storage')) {
        if (settings.storage.key === 'key' || settings.storage.key === 'basename') {
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

    this.createResponse = (propertyStatus, propertyContent) => {
        const propertyResponse = new Response();
        if (isPrimitive) {
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
                    const subResponse = subProperty.createResponse(subStatus, subContent);
                    propertyResponse.set(subPropertyName, subResponse)
                }
            }
        } else {
            for (let subPropertyName in subProperties) {
                const subProperty = subProperties[subPropertyName];
                const subPropertyContent = (propertyContent === null || typeof propertyContent !== 'object')
                    ? null
                    : propertyContent[subPropertyName];
                const subPropertyResponse = subProperty.createResponse(propertyStatus, subPropertyContent);
                propertyResponse.set(subPropertyName, subPropertyResponse)
            }
        }
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

    this.renderUiElement = (action, options, source, xyz, entityId) => {
        const type = settings.type || DEFAULT_TYPE;
        if (types.hasOwnProperty(type)) {
            const uri = this.getUri(entityId);
            const content = source.getContent();
            const status = source.getStatus();
            if (types[type].hasOwnProperty(action)) {
                let onChange;
                if (action === 'edit') {
                    onChange = content => {
                        this.patch(uri, uriTools.wrapContent(uri, content));
                    }
                }
                const TAG = types[type][action](xyz, uri, status, content, settings, options, onChange);
                TAG.className = `xyz-status-${status}`;
                return TAG;
            } else if (settings.hasOwnProperty('signature')) { // create editor from signature view
                let html = '';
                //TODO check if content if object
                //TODO check if settings.signature is object
                const DIV = document.createElement('DIV');
                DIV.className = `xyz-status-${status}`;
                for (let subPropertyName in subProperties) {
                    const subProperty = subProperties[subPropertyName];
                    const subSettings = settings.signature[subPropertyName];
                    const subPropertySource = source.get(subPropertyName);
                    const TAG = subProperty.renderUiElement(action, options, subPropertySource, xyz, entityId);
                    TAG.className = `xyz-status-${status}`;
                    DIV.appendChild(TAG);
                }
                return DIV;
            } else {
                console.error('problem1');
                //TODO something default and/or error
            }
        } else {
            console.error('problem2');
            //TODO something default and/or error
        }
    }
};