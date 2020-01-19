exports.actions = {
    edit: function (item) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        const SPAN = document.createElement('SPAN');
        //TODO check if content is array
        const content = item.getContent();
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        for (let key in content) {
            const subUri = item.getUri() + '/' + key;
            const subContent = content[key];
            const TAG = item.renderElement('view', subUri, item.getStatus(), subContent, subSettings, subOptions);
            const DIV_sub = document.createElement('DIV');
            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            //TODO add class
            INPUT_remove.value = 'x';
            DIV_sub.appendChild(INPUT_remove);
            DIV_sub.appendChild(TAG);
            SPAN.appendChild(DIV_sub);
        }
        const subUri = item.getUri(); //TODO add something
        const newContent = null;//TODO default value
        const DIV_CREATE = document.createElement('DIV');
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const TAG_create = item.renderElement('edit', subUri, item.getStatus(), newContent, subSettings, subOptions);
        DIV_CREATE.appendChild(TAG_create);
        DIV_CREATE.appendChild(INPUT_create);
        SPAN.appendChild(DIV_CREATE);
        return SPAN;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        //TODO check if content is array
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const content = item.getContent();
        for (let key in content) {
            const subUri = item.getUri() + '/' + key;
            const subContent = content[key];
            const TAG = item.renderElement('view', subUri, item.getStatus(), subContent, subSettings, subOptions);
            SPAN.appendChild(TAG);
        }
        return SPAN;
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