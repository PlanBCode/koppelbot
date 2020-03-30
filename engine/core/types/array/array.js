const object = require('../object/object');

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
        const DIV_CREATE = document.createElement('DIV');
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.validUris = {};
        INPUT_create.value = "Add";
        const data = {};

        const TRs = item.renderCreator(subOptions, item.getUri(), subSettings, [0], data, INPUT_create);
        const TABLE_create = document.createElement('TABLE');
        TRs.forEach(TR => TABLE_create.appendChild(TR));

        DIV_CREATE.appendChild(TABLE_create);
        DIV_CREATE.appendChild(INPUT_create);
        SPAN.appendChild(DIV_CREATE);
        let length = content.length;
        const rows = [];
        const addRow = (key, subContent) => {
            ++length;
            const TAG = item.renderSubElement('edit', [key], item.getStatus(), subContent, subSettings, subOptions);
            const DIV_sub = document.createElement('DIV');
            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            INPUT_remove.onclick = () => {
                item.delete([key]);
            };
            INPUT_remove.value = 'x';
            DIV_sub.appendChild(INPUT_remove);
            DIV_sub.appendChild(TAG);
            rows[key] = DIV_sub;
            SPAN.insertBefore(DIV_sub, DIV_CREATE);
        };
        const deleteRow = key => {
            const TAG_row = rows[key];
            rows.splice(key, 1);
            SPAN.removeChild(TAG_row);
        };
        INPUT_create.onclick = () => {
            item.patch(data[0], [length]);
        };

        for (let key in content) {
            const subContent = content[key];
            addRow(key, subContent);
        }

        object.setupOnChange(item, rows, addRow, deleteRow);
        return SPAN;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const content = makeArray(item.getContent());
        const rows = [];
        const addRow = (key, subContent) => {
            const TAG = item.renderSubElement('view', [key], item.getStatus(), subContent, subSettings, subOptions);
            rows[key] = TAG;
            SPAN.appendChild(TAG);
        };
        const deleteRow = key => {
            const TAG_row = rows[key];
            rows.splice(key, 1);
            SPAN.removeChild(TAG_row);
        };
        for (let key in content) {
            const subContent = content[key];
            addRow(key, subContent);
        }
        object.setupOnChange(item, rows, addRow, deleteRow);
        return SPAN;
    },
    validateContent: function (item) {
        const content = item.getContent();
        if (content === null || typeof content !== 'object') {
            return false;
        }
        const subSettings = item.getSetting('subType');
        for (let key in content) {
            const subContent = content[key];
            if (!item.validateContent(subContent, subSettings)) {
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