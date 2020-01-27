const response = require('../entity/response.js');
const json = require('../web/json.js');
const render = require('./render');

// onChange = (content, [additionalSubPropertyPath]) => {...}
// onDelete = (content, [additionalSubPropertyPath]) => {...}

function Item(xyz, baseUri, subPropertyPath, status, content, settings, options, onChange, onDelete, creatorData) {
    const callbacks = [];

    this.getUri = () => baseUri;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getOptions = () => options;
    this.getOption = optionName => options[optionName];
    this.hasOption = optionName => options.hasOwnProperty(optionName);
    this.getSettings = () => settings;
    this.getSetting = settingName => settings[settingName];
    this.hasSetting = settingName => settings.hasOwnProperty(settingName);

    this.patch = (newContent, additionalSubPropertyPath) => {
        additionalSubPropertyPath = additionalSubPropertyPath || [];
        const data = json.set({}, additionalSubPropertyPath, newContent);
        const node = new response.Node({}, '?', 200, data, [], 'PATCH'); // not defining object and entityId
        for (let callback of callbacks) {
            callback(node);
        }
        // note: adding the subPropertyPath and additionalSubPropertyPath is handled by the onChange function
        (options.onChange || onChange)(newContent, additionalSubPropertyPath);
    };

    this.delete = subPropertyPath => {
        //TODO call callbacks
        (options.onDelete || onDelete)(subPropertyPath);
    };

    this.renderSubElement = (action, additionalSubPropertyPath, status, content, settings, options_) => {
        if (options.display === 'create') {
            const TABLE = document.createElement('TABLE');
            TABLE.style.display = 'inline-block';
            json.set(creatorData, subPropertyPath.concat(additionalSubPropertyPath), content);
            const TRs = render.creator(xyz, options_, baseUri, settings, subPropertyPath.concat(additionalSubPropertyPath), creatorData);
            for (let TR of TRs) {
                TABLE.appendChild(TR);
            }
            return TABLE;
        } else {
            return render.element(xyz, action, baseUri, subPropertyPath.concat(additionalSubPropertyPath), status, content, settings, options_);
        }
    };

    this.renderCreator = (options, uri, settings, subPropertyPath, newCreatorData) => render.creator(xyz, options, uri, settings, subPropertyPath, newCreatorData);

    //TODO this is not congruent with this.patch and this.delete
    this.get = (uri, dataCallback) => xyz.get(uri, dataCallback);

    this.validate = xyz.validate;
    this.ui = xyz.ui;
    // callback = (status,content)=>{...}
    this.onChange = callback => {
        callbacks.push(callback);
        if (options.display !== 'create') {
            if (typeof callback !== 'function') throw new TypeError("callback is not a function.");
            const fullUri = subPropertyPath.length > 0
                ? baseUri + '/' + subPropertyPath.join('/')
                : baseUri;
            xyz.on(fullUri, 'changed', (entityClass, entityId, node, eventName) => callback(node));
            // TODO unregister these listeners somehow
        }
    }

}

exports.constructor = Item;