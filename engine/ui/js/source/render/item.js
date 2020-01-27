const json = require('../web/json.js');
const render = require('./render');

// onChange = (content, [additionalSubPropertyPath]) => {...}
// onDelete = (content, [additionalSubPropertyPath]) => {...}

function Item(xyz, baseUri, subPropertyPath, status, content, settings, options, onChange, onDelete, creatorData) {

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
        console.log('x', newContent, subPropertyPath, additionalSubPropertyPath);
        /*additionalSubPropertyPath = typeof additionalSubPropertyPath === 'undefined'
            ? subPropertyPath
            : subPropertyPath.concat(additionalSubPropertyPath);*/
        (options.onChange || onChange)(newContent, additionalSubPropertyPath);
    };
    this.delete = subUri => (options.onDelete || onDelete)(subUri);

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
        console.log('onChange');
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