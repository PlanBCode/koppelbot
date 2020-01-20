exports.actions = {
    edit: function (item) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        //TODO check if content is array
        const content = item.getContent();
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const TABLE = document.createElement('TABLE');

        if (typeof content === 'object' && content !== null) {
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

                const subUri = item.getUri() + '/' + key;
                const subContent = content[key];
                const TAG = item.renderElement('edit', subUri, item.getStatus(), subContent, subSettings, subOptions);
                TD_value.appendChild(TAG);

                TR.appendChild(TD_key);
                TR.appendChild(TD_value);
                TABLE.appendChild(TR);
            }
        }
        const TR_add = document.createElement('TR');
        const TD_key = document.createElement('TD');
        const TD_value = document.createElement('TD');
        const INPUT_key = document.createElement('INPUT');

        const subUri = item.getUri(); //TODO add something
        const newContent = null;//TODO default value
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const TAG_create = item.renderElement('edit', subUri, item.getStatus(), newContent, subSettings, subOptions);
        TD_key.appendChild(INPUT_key);
        TD_value.appendChild(TAG_create);
        TD_value.appendChild(INPUT_create);

        TR_add.appendChild(TD_key);
        TR_add.appendChild(TD_value);
        TABLE.appendChild(TR_add);
        return TABLE;
    },
    view: function (item) {
        //TODO check if content is array
        const content = item.getContent();
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const TABLE = document.createElement('TABLE');
        for (let key in content) {
            const TR = document.createElement('TR');
            const TD_key = document.createElement('TD');
            const TD_value = document.createElement('TD');
            TD_key.innerText = key;
            TR.appendChild(TD_key);

            const subUri = item.getUri() + '/' + key;
            const subContent = content[key];
            const TAG = item.renderElement('view', subUri, item.getStatus(), subContent, subSettings, subOptions);
            TD_value.appendChild(TAG);
            TR.appendChild(TD_value);
            TABLE.appendChild(TR);
        }
        return TABLE;
    },
    validate: function (item) {
        const content = item.getContent();
        if (content === null || typeof content !== 'object') {
            return false;
        }
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        for (let key in content) {
            const subUri = item.getUri() + '/' + key;
            const subContent = content[key];
            if (!item.validate(subUri, item.getStatus(), subContent, subSettings, subOptions)) {
                return false;
            }
        }
        return true;
    }
};