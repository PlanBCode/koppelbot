exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        //TODO check if content is array
        const subSettings = settings.subType;
        const subOptions = options; //TODO
        const TABLE = document.createElement('TABLE');
        for (let key in content) {
            const TR = document.createElement('TR');
            const TD_key = document.createElement('TD');
            const TD_value = document.createElement('TD');

            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            //TODO add class
            INPUT_remove.value = 'x';
            TD_key.appendChild(INPUT_remove);
            const TEXT_key = document.createTextNode(key)
            TD_key.appendChild(TEXT_key);

            const subUri = uri + '/' + key;
            const subContent = content[key];
            const TAG = xyz.renderElement('edit', subUri, status, subContent, subSettings, subOptions);
            TD_value.appendChild(TAG);

            TR.appendChild(TD_key);
            TR.appendChild(TD_value);
            TABLE.appendChild(TR);
        }
        const TR_add = document.createElement('TR');
        const TD_key = document.createElement('TD');
        const TD_value = document.createElement('TD');
        const INPUT_key = document.createElement('INPUT');

        const subUri = uri; //TODO add something
        const newContent = null;//TODO default value
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const TAG_create = xyz.renderElement('edit', subUri, status, newContent, subSettings, subOptions);
        TD_key.appendChild(INPUT_key);
        TD_value.appendChild(TAG_create);
        TD_value.appendChild(INPUT_create);

        TR_add.appendChild(TD_key);
        TR_add.appendChild(TD_value);
        TABLE.appendChild(TR_add);
        return TABLE;
    },
    view: function (xyz, uri, status, content, settings, options) {
        //TODO check if content is array
        const subSettings = settings.subType;
        const subOptions = options; //TODO
        const TABLE = document.createElement('TABLE');
        for (let key in content) {
            const TR = document.createElement('TR');
            const TD_key = document.createElement('TD');
            const TD_value = document.createElement('TD');
            TD_key.innerText = key;
            TR.appendChild(TD_key);

            const subUri = uri + '/' + key;
            const subContent = content[key];
            const TAG = xyz.renderElement('view', subUri, status, subContent, subSettings, subOptions);
            TD_value.appendChild(TAG);
            TR.appendChild(TD_value);
            TABLE.appendChild(TR);
        }
        return TABLE;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        if (content === null || typeof content !== 'object') {
            return false;
        }
        const subSettings = settings.subType;
        const subOptions = options; //TODO
        for (let key in content) {
            const subUri = uri + '/' + key;
            const subContent = content[key];
            if (!xyz.validate(subUri, subStatus, subContent, subSettings, subOptions)) {
                return false;
            }
        }
        return true;
    }
};