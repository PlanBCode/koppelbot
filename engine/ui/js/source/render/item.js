const render = require('./render');

function Item(xyz, uri, status, content, settings, options, onChange, onDelete) {

    this.getUri = () => uri;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getOptions = () => options;
    this.getOption = optionName => options[optionName];
    this.hasOption = optionName => options.hasOwnProperty(optionName);
    this.getSettings = () => settings;
    this.getSetting = settingName => settings[settingName];
    this.hasSetting = settingName => settings.hasOwnProperty(settingName);

    this.patch = onChange; // (newContent,subUri) => {...}
    this.delete = onDelete; // subUri => {...}

    this.renderElement = (action, uri, status, content, settings, options) => render.element(xyz, action, uri, status, content, settings, options);

    this.creator = (options, uri, settings, propertyName, data) => render.creator(options, uri, settings, propertyName, data);

    this.validate = xyz.validate;
    this.ui = xyz.ui;
    // callback = (status,content)=>{...}
    this.onChange = callback => {
        if (typeof callback !== 'function') throw new TypeError("callback is not a function.");
        xyz.on(uri, 'changed', (entityClass, entityId, node, eventName) => callback(node));
        // TODO unregister these listeners somehow
    }

}

exports.constructor = Item;