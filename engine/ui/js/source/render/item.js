const render = require('./render');

function Item(xyz, uri, status, content, settings, options, onChange, onDelete, creatorData) {

    this.getUri = () => uri;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getOptions = () => options;
    this.getOption = optionName => options[optionName];
    this.hasOption = optionName => options.hasOwnProperty(optionName);
    this.getSettings = () => settings;
    this.getSetting = settingName => settings[settingName];
    this.hasSetting = settingName => settings.hasOwnProperty(settingName);

    this.patch = (newContent, subUri) => (options.onChange || onChange)(newContent, subUri);
    this.delete = subUri => (options.onDelete || onDelete)(subUri);

    this.renderElement = (action, uri, status, content, settings, options_) => {
        if (options.display === 'create') {
            const TABLE = document.createElement('TABLE');
            TABLE.style.display = 'inline-block';
            //TODO pass initial value to creator
            const TRs = render.creator(xyz, options_, uri, settings, 'TODO', creatorData)
            for(let TR of TRs){
                TABLE.appendChild(TR);
            }
            return TABLE;
        } else {
            return render.element(xyz, action, uri, status, content, settings, options_);
        }
    };

    this.creator = (options, uri, settings, propertyName, data) => render.creator(xyz, options, uri, settings, propertyName, data);

    //TODO this is not congruent with this.patch and this.delete
    this.get = (uri, dataCallback) => xyz.get(uri, dataCallback);

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