const types = require('../../build/types.js');
const listener = require('./listener.js');
const State = require('./state.js').State;
const response = require('./response.js');
const render = require('../render/render.js');

exports.constructor = function Property(xyz, parent, propertyName, meta) {
    listener.Handler.call(this);

    const subProperties = {};
    const contents = {};
    const errors = {};//TODO
    const statusses = {};//TODO

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
            subProperties[propertyName] = new Property(xyz, this, propertyName, settings.signature[propertyName]);
        }
    }

    this.getSettings = () => settings;

    this.getUri = entityId => parent.getUri(entityId) + '/' + propertyName;

    this.getResponse = (path, entityId) => {
        if (isPrimitive) {
            return new response.Node(this, entityId, statusses[entityId], contents[entityId], errors[entityId]);
        } else {
            const subPropertyNames = (path.length === 0 || path[0] === '*')
                ? Object.keys(subProperties)
                : path[0].split(',');
            const content = {};
            const subPath = path.slice(1);
            for (let subPropertyName of subPropertyNames) {
                if (subProperties.hasOwnProperty(subPropertyName)) {
                    content[subPropertyName] = subProperties[subPropertyName].getResponse(subPath, entityId);
                } else {
                    content[subPropertyName] = new response.Node(this, entityId, 400, null, [`${subPropertyName} does not exist.`]); //TODO
                }
            }
            return content;
        }
    };

    this.handleInput = (entityId, propertyStatus, propertyContent) => {
        const state = new State();
        if (isPrimitive) {
            if (contents.hasOwnProperty(entityId)) {
                const prevPropertyContent = contents[entityId];
                switch (propertyStatus) {
                    case 200:
                        if (prevPropertyContent !== propertyContent) {
                            state.setChanged();
                        }
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        //TODO use message frop source if available
                        // TODO check if error is new eg compare with current error in errors
                        state.setError(404, 'Not found');
                        break;
                    default:
                        //state.setError(); // TODO compare with current error in errors
                        throw new Error('Unsupported status ' + propertyStatus);
                }
            } else { // if 200 then created, else error
                switch (propertyStatus) {
                    case 200:
                        state.setCreated();
                        contents[entityId] = propertyContent;
                        break;
                    case 404:
                        //TODO use message frop source if available
                        // TODO check if error is new eg compare with current error in errors
                        state.setError(404, 'Not found');                         break;
                    default:
                        //state.setError(); TODO compare with current error in errors
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
                    const subState = subProperty.handleInput(entityId, subStatus, subContent);
                    state.addSubState(subState);
                }
            }
        } else {
            for (let subPropertyName in subProperties) {
                const subProperty = subProperties[subPropertyName];
                const subPropertyContent = (propertyContent === null || typeof propertyContent !== 'object')
                    ? null
                    : propertyContent[subPropertyName];
                const subState = subProperty.handleInput(entityId, propertyStatus, subPropertyContent);
                state.addSubState(subState);
            }
        }
        statusses[entityId] = state.getStatus();
        this.callListeners(state, entityId, this.getResponse([], entityId));
        return state;
    };

    const addPropertyListener = (entityId, path, eventName, callback) => {
        if (path.length === 0) {
            this.addAtomicListener(entityId, eventName, callback);
        } else if (!isPrimitive) {
            //TODO error
            console.error('No subproperties, property is primitive')
        } else {
            const subPropertNameList = path[0];
            const subPropertyNames = subPropertNameList === '*'
                ? Object.keys(properties)
                : subPropertNameList.split(',');
            const subPath = path.slice(1);
            for (let subPropertyName of subPropertyNames) {
                if (subProperties.hasOwnProperty(subPropertyName)) {
                    subProperties[subPropertyName].addPropertyListener(entityId, subPath, eventName, callback)
                } else {
                    //TODO throw error?
                    console.error(subPropertyName + 'not available')
                }
            }
        }
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

    this.render = (action, options, entityId) => {
        //TODO get xyz here
        if(isPrimitive) {
            const uri = this.getUri(entityId);
            const content = contents[entityId];
            const status = statusses[entityId];
            const TAG = render.element(xyz, action, uri, status, content, settings, options);
            return TAG;
        }else{
            //TODO loop through subproperties and render all
            const DIV = document.createElement('DIV');
            for(let subPropertyName in subProperties){
                const TAG = subProperties[subPropertyName].render(action,options,entityId);
                DIV.appendChild(TAG);
            }
            return DIV;
        }
    };
};