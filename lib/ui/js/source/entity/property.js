const Response = require('../response/response.js').constructor;
const types = require('../types/types.js').types;

exports.constructor = function Property(propertyName, meta) {

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
            subProperties[propertyName] = new Property(propertyName, settings.signature[propertyName]);
        }
    }

    this.createResponse = (status, content) => {
        const response = new Response();
        if (isPrimitive) {
            response.setContent(status, content);
        } else if (status === 207) {
            for (let propertyName in subProperties) {//TODO check if data is of this shape
                const property = subProperties[propertyName];
                const subStatus = content[propertyName].status; //TODO check if data is of this shape
                const subContent = content[propertyName].content;
                const subResponse = property.createResponse(subStatus, subContent);
                response.set(propertyName, subResponse)
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

    this.createCreator = (options, data) => {
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
            const element = types[type].edit(uri, content, settings, options, onChange);
            const TD_content = document.createElement('TD');
            TD_content.appendChild(element);
            TR.appendChild(TD_content);
            TRs.push(TR);
        } else if (!isPrimitive) {
            for (let propertyName in subProperties) {
                data[propertyName] = {};
                TRs.push(...subProperties[propertyName].createCreator(options, data[propertyName]));
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
};