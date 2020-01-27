const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;
const json = require('../web/json.js');

const DEFAULT_TYPE = 'string';

function element(xyz, action, uri, status, content, settings, options) {
    const type = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(type)) {
        console.error('problem1');
        return;
    }
    if (types[type].hasOwnProperty(action)) {
        let onChange, onDelete;
        if (action === 'edit') {
            onChange = (content, subUri) => { //TODO use subUri
                subUri = typeof subUri === 'undefined' ? '' : ('/' + subUri);
                xyz.patch(uri + subUri, uriTools.wrapContent(uri, content));
            };
            onDelete = subUri => {
                subUri = typeof subUri === 'undefined' ? '' : ('/' + subUri);
                xyz.delete(uri + subUri);
            };
        }

        const item = new Item(xyz, uri, status, content, settings, options, onChange, onDelete);
        const TAG = types[type][action](item); // TODO
        //  item.forceChange();

        // TODO add id from options (also for label for)
        // TODO add class from options

        TAG.className = `xyz-status-${status}`;
        return TAG;
    } else if (settings.hasOwnProperty('signature')) { // create editor from signature view
        //TODO check if content if object
        //TODO check if settings.signature is object
        const DIV = document.createElement('DIV');
        DIV.className = `xyz-status-${status}`;
        for (let subPropertyName in settings.signature) {
            const subSettings = settings.signature[subPropertyName];
            const subContent = content[subPropertyName];
            const subType = subSettings.type;
            const subUri = uri + '/' + subPropertyName;
            const TAG = element(xyz, subType, action, subUri, status, subContent, subSettings, options);
            TAG.className = `xyz-status-${status}`;
            DIV.appendChild(TAG);
        }
        return DIV;
    } else {
        console.error('problem2');
        //TODO something default and/or error
    }
}

function creator(xyz, options, uri, settings, propertyName, data) {
    const type = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(type)) {
        console.error('problem1'); //TODO return a TR containing the error
        return [];
    }
    const entityClassName = uriTools.pathFromUri(uri)[0];
    if (type === 'id' && xyz.isAutoIncremented(entityClassName)) {
        return [];
    }

    if (!types[type].hasOwnProperty('edit')) {
        console.error('problem1');
        return []; //TODO return a TR containing the error
    }
    const TRs = [];
    const content = settings.hasOwnProperty('default') ? settings.default : null;
    // TODO html label for gebruiken
    const TR = document.createElement('TR');
    if (options.showLabels !== false) {
        const TD_label = document.createElement('TD');
        TD_label.innerText = propertyName;
        TR.appendChild(TD_label);
    }
    const onChange = (content, subUri) => {
        subUri = typeof subUri === 'number' ? subUri.toString() : subUri;
        const keyPath = typeof subUri === 'undefined' ?
            [propertyName] :
            [propertyName, ...subUri.split('/')];
        json.set(data, keyPath, content);
    };
    const onDelete = subUri => {
        const keyPath = typeof subUri === 'undefined' ?
            [propertyName] :
            [propertyName, ...subUri.split('/')];
        json.unset(data, keyPath);
    };
    const item = new Item(xyz, uri, 200, content, settings, options, onChange, onDelete, data);
    const ELEMENT = types[type].edit(item);
    // TODO add id from options (also for label for)
    // TODO add class from options
    const TD_content = document.createElement('TD');
    TD_content.appendChild(ELEMENT);
    TR.appendChild(TD_content);
    TRs.push(TR);
    return TRs;
}

exports.element = element;
exports.creator = creator;