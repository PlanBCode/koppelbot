exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        const SPAN = document.createElement('SPAN');
        //TODO check if content is array
        const subSettings = settings.subType;
        const subOptions = options; //TODO
        for (let key in content) {
            const subUri = uri + '/' + key;
            const subContent = content[key];
            const TAG = xyz.renderElement('view', subUri, status, subContent, subSettings, subOptions);
            const DIV_sub = document.createElement('DIV');
            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            //TODO add class
            INPUT_remove.value = 'x';
            DIV_sub.appendChild(INPUT_remove);
            DIV_sub.appendChild(TAG);
            SPAN.appendChild(DIV_sub);
        }
        const subUri = uri; //TODO add something
        const newContent = null;//TODO default value
        const DIV_CREATE = document.createElement('DIV');
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const TAG_create = xyz.renderElement('edit', subUri, status, newContent, subSettings, subOptions);
        DIV_CREATE.appendChild(TAG_create);
        DIV_CREATE.appendChild(INPUT_create);
        SPAN.appendChild(DIV_CREATE);
        return SPAN;
    },
    view: function (xyz, uri, status, content, settings, options) {
        const SPAN = document.createElement('SPAN');
        //TODO check if content is array
        const subSettings = settings.subType;
        const subOptions = options; //TODO
        for (let key in content) {
            const subUri = uri + '/' + key;
            const subContent = content[key];
            const TAG = xyz.renderElement('view', subUri, status, subContent, subSettings, subOptions);
            SPAN.appendChild(TAG);
        }
        return SPAN;
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