const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;
const json = require('../web/json.js');

const DEFAULT_TYPE = 'string';

function createTmpContentToValidate(data, content, subPropertyPath, additionalSubPropertyPath) {
    /*  fix for patching  sub data
    suppose current your current data data = {myArray: ['value1']}
    and your patching a (content='value2', additionalSubPropertyPath=[1])
    then construct tmpContent {myArray: ['value1','value2']} to validate the contents
    */
    if (typeof subPropertyPath === 'undefined') subPropertyPath = [];
    if (typeof additionalSubPropertyPath === 'undefined') additionalSubPropertyPath = [];

    const mainContent = json.get(data, subPropertyPath);
    let tmpContent = JSON.parse(JSON.stringify(mainContent));
    tmpContent = json.set(tmpContent, additionalSubPropertyPath, content);
    return tmpContent;
}

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
            onChange = (subContent, additionalSubPropertyPath) => {

                const tmpContentToValidate = createTmpContentToValidate(content, subContent, subPropertyPath, additionalSubPropertyPath);

                const item = new Item(xyz, uri, subPropertyPath, status, tmpContentToValidate, settings, options, onChange, onDelete);
                if (item.validateContent()) {
                    additionalSubPropertyPath = subPropertyPath.concat(additionalSubPropertyPath);
                    const subUri = typeof additionalSubPropertyPath === 'undefined' ? '' : ('/' + additionalSubPropertyPath.join('/'));
                    TAG.classList.remove('xyz-invalid-content');
                    xyz.patch(uri + subUri, uriTools.wrapContent(uri + subUri, subContent));
                } else {
                    TAG.classList.add('xyz-invalid-content');
                }
            };
            onDelete = subUri => {
                //TODO use subPropertyPath
                subUri = typeof subUri === 'undefined' ? '' : ('/' + subUri);
                xyz.delete(uri + subUri);
            };
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
   /* TODO WIP
       xyz.on('/session/*', 'checked', (a, b) => {
        console.log('>>>', a, b);
    })*/

    const accessSettings = settings.access || {};

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
        TD_label.innerText = typeof options.label === 'string'
            ? options.label
            : subPropertyPath[0];
        TR.appendChild(TD_label);
    }
    let TAG;

    const validate = item => {

        const uri = item.getUri();
        if (item.validateContent()) {
            TAG.classList.remove('xyz-invalid-content');
            if (INPUT_submit) {
                INPUT_submit.validUris[uri] = true;
                const disabled = Object.values(INPUT_submit.validUris).reduce((disabled, valid) => disabled || !valid, false);
                if (!disabled) INPUT_submit.removeAttribute('disabled');
            }
            return true;
        } else {
            TAG.classList.add('xyz-invalid-content');
            if (INPUT_submit) {
                INPUT_submit.validUris[uri] = false;
                INPUT_submit.setAttribute('disabled', 'true');
            }
            return false;
        }
    };

    let onChange, onDelete;
    onChange = (content, additionalSubPropertyPath) => {
        const tmpContentToValidate = createTmpContentToValidate(data, content, subPropertyPath, additionalSubPropertyPath);
        const item = new Item(xyz, uri, subPropertyPath, 200, tmpContentToValidate, settings, options, onChange, onDelete, data);
        if (validate(item)) {
            const keyPath = typeof additionalSubPropertyPath === 'undefined'
                ? subPropertyPath
                : subPropertyPath.concat(additionalSubPropertyPath);
            json.set(data, keyPath, content);
        }
    };
    onDelete = subUri => {
        //TODO rewrite for subPropertyPath
        const keyPath = typeof subUri === 'undefined' ?
            [subPropertyPath] :
            [...subPropertyPath, ...subUri.split('/')];
        json.unset(data, keyPath);
    };

    let content;
    try {
        content = json.get(data, subPropertyPath);
    } catch (e) {
        content = null;
    }
    if (content === null) {
        if (settings.hasOwnProperty('default')) {
            content = settings.default;
        } else if (type.json.hasOwnProperty('default') && type.json.default.hasOwnProperty('default')) {
            // does the default have a default
            content = type.json.default.default;
        }
        try {
            json.set(data, subPropertyPath, content);
        } catch (e) {
            console.error('render.creator json.set failed', e);
        }
    }

    const item = new Item(xyz, uri, subPropertyPath, 200, content, settings, options, onChange, onDelete, data);
    TAG = type.edit(item);
    validate(item);
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
