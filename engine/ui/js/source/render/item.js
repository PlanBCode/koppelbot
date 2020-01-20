const render = require('./render');

function Item(xyz, uri, status, content, settings, options, onChange) {

    this.getUri = () => uri;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getOptions = () => options;
    this.getOption = optionName => options[optionName];
    this.hasOption = optionName => options.hasOwnProperty(optionName);
    this.getSettings = () => settings;
    this.getSetting = settingName => settings[settingName];
    this.hasSetting = settingName => settings.hasOwnProperty(settingName);

    this.patch = onChange;

    this.renderElement = (action, uri, status, content, settings, options) => render.element(xyz, action, uri, status, content, settings, options);

    this.validate = xyz.validate;
    this.ui = xyz.ui;
    // callback = (status,content)=>{...}
    this.onChange = callback => {
        xyz.on(uri, 'change', (entityId, node, eventName) => {

            //TODO get Node from node wrapper YOYO1
        });
        // TODO unregister these listeners somehow
    }

}

exports.constructor = Item;