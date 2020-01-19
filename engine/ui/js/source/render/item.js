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
    this.renderElement = xyz.renderElement;
    this.validate = xyz.validate;
    this.ui = xyz.ui;
}

exports.constructor = Item;