const object = require('./object');

exports.actions = {
    edit: function (item) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        const SPAN = document.createElement('SPAN');

        //TODO check if content is array
        const content = item.getContent() === null
            ? []
            : item.getContent();

        const subSettings = item.getSetting('subType');
        const subOptions = {showLabels: false};

        const subUri = item.getUri() + '/' + content.length;
        const newContent = null;//TODO default value
        const DIV_CREATE = document.createElement('TABLE');
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const data = {};
        const TRs = item.creator(subOptions, subUri, subSettings, content.length, data);
        const TABLE_create = document.createElement('TABLE');
        TRs.forEach(TR => TABLE_create.appendChild(TR));
        INPUT_create.onclick = () => {
            item.patch(data, content.length);
        };
        DIV_CREATE.appendChild(TABLE_create);
        DIV_CREATE.appendChild(INPUT_create);
        SPAN.appendChild(DIV_CREATE);

        const rows = [];
        const addRow = (key, subContent) => {

            const subUri = item.getUri() + '/' + key;
            const TAG = item.renderElement('edit', subUri, item.getStatus(), subContent, subSettings, subOptions);
            const DIV_sub = document.createElement('DIV');
            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            INPUT_remove.onclick = () => {
                item.delete(key);
            };
            INPUT_remove.value = 'x';
            DIV_sub.appendChild(INPUT_remove);
            DIV_sub.appendChild(TAG);
            rows[key] = DIV_sub;
            SPAN.insertBefore(DIV_sub, DIV_CREATE);
        };


        for (let key in content) {
            const subContent = content[key];
            addRow(key, subContent);
        }

        object.setupOnChange(item, rows, addRow);
        return SPAN;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        //TODO check if content is array
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const content = item.getContent();
        const rows = [];
        const addRow = (key, subContent) => {
            const subUri = item.getUri() + '/' + key;
            const TAG = item.renderElement('view', subUri, item.getStatus(), subContent, subSettings, subOptions);
            rows[key] = TAG;
            SPAN.appendChild(TAG);
        };
        for (let key in content) {
            const subContent = content[key];
            addRow(key, subContent);
        }
        object.setupOnChange(item, rows, addRow);
        return SPAN;
    },
    validateContent: function (item) {
        const content = item.getContent();
        if (content === null || typeof content !== 'object') {
            return false;
        }
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        for (let key in content) {
            const subUri = item.getUri() + '/' + key;
            const subContent = content[key];
            if (!item.validateContent(subUri, item.getStatus(), subContent, subSettings, subOptions)) {
                return false;
            }
        }
        return true;
    },
    validateSubPropertyPath: function (subPropertyPath, settings) {
        return subPropertyPath instanceof Array &&
            subPropertyPath.length === 1 &&
            !isNaN(subPropertyPath[0]) &&
            Number(subPropertyPath) === Math.floor(subPropertyPath);
    }
};