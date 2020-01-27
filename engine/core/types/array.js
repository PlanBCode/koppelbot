const object = require('./object');

function makeArray(content) {
    if (content === null) {
        return [];
    } else if (content instanceof Array) {
        return content;
    } else if (typeof content === 'object') { // if data is an object, reshape to array
        const tmp = [];
        for (let key in content) {
            tmp[key] = content[key];
        }
        return tmp;
    } else {
        //TODO problem
        return [];
    }
}

exports.actions = {
    edit: function (item) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        const SPAN = document.createElement('SPAN');
        const content = makeArray(item.getContent());

        const subSettings = item.getSetting('subType');
        const subOptions = {showLabels: false, display: item.getOption('display')};
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

        DIV_CREATE.appendChild(TABLE_create);
        DIV_CREATE.appendChild(INPUT_create);
        SPAN.appendChild(DIV_CREATE);

        const rows = [];
        const addRow = (key, subContent) => {
            const subUri = item.getUri() + '/' + key;
            console.log('a')
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

        INPUT_create.onclick = () => {
            addRow(content.length, data[content.length]);
            item.patch(data, content.length);
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
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const content = makeArray(item.getContent());
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
    validateSubPropertyPath: function (subPropertyPath, settings, validateSubPropertyPath) {
        const subType = settings.subType.type || 'string';
        return subPropertyPath instanceof Array &&
            !isNaN(subPropertyPath[0]) &&
            Number(subPropertyPath) === Math.floor(subPropertyPath) &&
            validateSubPropertyPath(subType, subPropertyPath.slice(1));
    }
};