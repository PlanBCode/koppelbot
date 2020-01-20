const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;

const DEFAULT_TYPE = 'string';

function element(xyz, action, uri, status, content, settings, options) {
    const type = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(type)) {
        console.error('problem1');
        return;
    }
    if (types[type].hasOwnProperty(action)) {
        let onChange;
        if (action === 'edit') {
            onChange = content => {
                xyz.patch(uri, uriTools.wrapContent(uri, content));
            }
        }

        const item = new Item(xyz, uri, status, content, settings, options, onChange);
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

function creator(options, type, uri, settings, propertyName, data) {
    if (!types.hasOwnProperty(type)) {
        console.error('problem1'); //TODO return a TR containing the error
        return [];
    }
    if (type === 'id') {
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
    const TD_label = document.createElement('TD');


    TD_label.innerText = propertyName;
    TR.appendChild(TD_label);
    const onChange = content => {
        data[propertyName] = content;
    };
    const item = new Item(xyz, uri, 200, content, settings, options, onChange);
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