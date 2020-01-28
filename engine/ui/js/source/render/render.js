const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;
const json = require('../web/json.js');

const DEFAULT_TYPE = 'string';

function element(xyz, action, uri, subPropertyPath, status, content, settings, options) {
    const type = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(type)) {
        console.error('problem1');
        return;
    }
    if (types[type].hasOwnProperty(action)) {
        let onChange, onDelete;
        if (action === 'edit') {
            onChange = (content, additionalSubPropertyPath) => {
                additionalSubPropertyPath = subPropertyPath.concat(additionalSubPropertyPath);
                const subUri = typeof additionalSubPropertyPath === 'undefined' ? '' : ('/' + additionalSubPropertyPath.join('/'));
                xyz.patch(uri + subUri, uriTools.wrapContent(uri + subUri, content));
            };
            onDelete = subUri => {
                //TODO use subPropertyPath
                subUri = typeof subUri === 'undefined' ? '' : ('/' + subUri);
                xyz.delete(uri + subUri);
            };
        }

        const item = new Item(xyz, uri, subPropertyPath, status, content, settings, options, onChange, onDelete);
        const TAG = types[type][action](item); // TODO
        //  item.forceChange();

        // TODO add id from options (also for label for)
        // TODO add class from options

        TAG.classList.add(`xyz-status-${status}`);
        return TAG;
    } else if (settings.hasOwnProperty('signature')) { // create editor from signature view
        //TODO check if content if object
        //TODO check if settings.signature is object
        const DIV = document.createElement('DIV');
        DIV.classList.add(`xyz-status-${status}`);
        for (let subPropertyName in settings.signature) {
            const subSettings = settings.signature[subPropertyName];
            const subContent = content[subPropertyName];
            const subType = subSettings.type;
            const subUri = uri + '/' + subPropertyName;
            const TAG = element(xyz, subType, action, subUri, subPropertyPath.concat([subPropertyName]), status, subContent, subSettings, options);
            TAG.classList.add(`xyz-status-${status}`);
            DIV.appendChild(TAG);
        }
        return DIV;
    } else {
        console.error('problem2');
        //TODO something default and/or error
    }
}

function creator(xyz, options, uri, settings, subPropertyPath, data) {
    const typeName = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(typeName)) {
        console.error('problem1'); //TODO return a TR containing the error
        return [];
    }

    const entityClassName = uriTools.pathFromUri(uri)[0];
    if (typeName === 'id' && xyz.isAutoIncremented(entityClassName)) {
        return [];
    }

    const type = types[typeName];

    if (!type.hasOwnProperty('edit')) {
        console.error('problem1');
        return []; //TODO return a TR containing the error
    }
    const TRs = [];
    // TODO html label for gebruiken
    const TR = document.createElement('TR');
    if (options.showLabels !== false) {
        const TD_label = document.createElement('TD');
        TD_label.innerText = subPropertyPath[0];
        TR.appendChild(TD_label);
    }
    const onChange = (content, additionalSubPropertyPath) => {
        const keyPath = typeof additionalSubPropertyPath === 'undefined'
            ? subPropertyPath
            : subPropertyPath.concat(additionalSubPropertyPath);
        json.set(data, keyPath, content);
    };
    const onDelete = subUri => {
        //TODO rewrite for subPropertyPath
        const keyPath = typeof subUri === 'undefined' ?
            [subPropertyPath] :
            [...subPropertyPath, ...subUri.split('/')];
        json.unset(data, keyPath);
    };

    let content = json.get(data, subPropertyPath);
    if (content === null) {
        if (settings.hasOwnProperty('default')) {
            content = settings.default;
        } else if (type.json.hasOwnProperty('default') && type.json.default.hasOwnProperty('default')) {
            // does the default have a default
            content = type.json.default.default;
        }
        json.set(data, subPropertyPath, content);
    }

    const item = new Item(xyz, uri, subPropertyPath, 200, content, settings, options, onChange, onDelete, data);
    const ELEMENT = type.edit(item);
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