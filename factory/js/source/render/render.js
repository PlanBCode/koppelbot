const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;
const json = require('../web/json.js');

const DEFAULT_TYPE = 'string';

function element(xyz, action, uri, subPropertyPath, status, content, settings, options) {
    const typeName = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(typeName)) {
        console.error('problem1');
        return null;
    }
    const type = types[typeName];
    if (type.hasOwnProperty(action)) {
        let onChange, onDelete;
        let TAG;
        if (action === 'edit') {
            onChange = (content, additionalSubPropertyPath) => {
                additionalSubPropertyPath = subPropertyPath.concat(additionalSubPropertyPath);
                const subUri = typeof additionalSubPropertyPath === 'undefined' ? '' : ('/' + additionalSubPropertyPath.join('/'));
                const item = new Item(xyz, uri, subPropertyPath, status, content, settings, options, onChange, onDelete);
                if (type.validateContent(item)) {
                    TAG.classList.remove('xyz-invalid-content');
                    xyz.patch(uri + subUri, uriTools.wrapContent(uri + subUri, content));
                    if (typeof options.onChange === 'function') options.onChange(content);
                } else {
                    TAG.classList.add('xyz-invalid-content');
                }
            };
            onDelete = subUri => {
                //TODO use subPropertyPath
                subUri = typeof subUri === 'undefined' ? '' : ('/' + subUri);
                xyz.delete(uri + subUri);
                //TODO options.onChange/onDelete?
            };
        } else if (typeof options.onChange === 'function') {
            onChange = options.onChange;
            //TODO options.onDelete/onDelete?
        }
        const item = new Item(xyz, uri, subPropertyPath, status, content, settings, options, onChange, onDelete);
        TAG = type[action](item);
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
        //TODO something default and/or error
        console.error('problem2');
        return null;
    }
}

function creator(xyz, options, uri, settings, subPropertyPath, data, INPUT_submit) {
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
    let TAG;
    let onChange, onDelete;
    onChange = (content, additionalSubPropertyPath) => {
        const keyPath = typeof additionalSubPropertyPath === 'undefined'
            ? subPropertyPath
            : subPropertyPath.concat(additionalSubPropertyPath);
        const item = new Item(xyz, uri, subPropertyPath, 200, content, settings, options, onChange, onDelete, data);
        if (type.validateContent(item)) {
            TAG.classList.remove('xyz-invalid-content');
            if (INPUT_submit) INPUT_submit.disabled = false;
            json.set(data, keyPath, content);
        } else {
            if (INPUT_submit) INPUT_submit.disabled = true;
            TAG.classList.add('xyz-invalid-content');
        }
    };
    onDelete = subUri => {
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
    TAG = type.edit(item);
    // TODO add id from options (also for label for)
    // TODO add class from options
    const TD_content = document.createElement('TD');
    TD_content.appendChild(TAG);
    TR.appendChild(TD_content);
    TRs.push(TR);
    return TRs;
}

exports.element = element;
exports.creator = creator;
