const setupOnChange = (item, rows, addRow, deleteRow) => item.onChange(item => {
    const content = item.getContent();
    for (let key in content) {
        if ((rows instanceof Array && rows.indexOf(key) === -1) || (!(rows instanceof Array) && !rows.hasOwnProperty(key))) {
            const subContent = content[key];
            addRow(key, subContent);
        }
    }
    for (let key in rows) {
        if ((rows instanceof Array && content.indexOf(key) === -1) || (!(rows instanceof Array) && !content.hasOwnProperty(key))) {
            const subContent = content[key];
            //TODO deleteRow(key);
        }
    }
});

exports.setupOnChange = setupOnChange;

exports.actions = {
    edit: function (item) {
        // TODO create ui for adding/removing elements
        // TODO create drop ui to drag elements to
        //TODO check if content is array
        const content = item.getContent();
        const subSettings = item.getSetting('subType');
        const subOptions = {showLabels: false};
        const TABLE = document.createElement('TABLE');
        const TR_add = document.createElement('TR');
        const TD_key = document.createElement('TD');
        const TD_value = document.createElement('TD');
        const INPUT_key = document.createElement('INPUT');

        const subUri = item.getUri() + '/$new';
        const newContent = null;//TODO default value
        const INPUT_create = document.createElement('INPUT');
        INPUT_create.type = "submit";
        //TODO add class
        INPUT_create.value = "Add";
        const data = {};
        const TRs = item.creator(subOptions, subUri, subSettings, '$new', data);
        const TABLE_create = document.createElement('TABLE');
        TRs.forEach(TR => TABLE_create.appendChild(TR));
        INPUT_create.onclick = () => {
            const key = INPUT_key.value;
            data[key] = data['$new'];
            delete data['$new'];
            item.patch(data, key);
        };

        TD_key.appendChild(INPUT_key);
        TD_value.appendChild(TABLE_create);
        TD_value.appendChild(INPUT_create);

        TR_add.appendChild(TD_key);
        TR_add.appendChild(TD_value);
        TABLE.appendChild(TR_add);

        const rows = {};
        const addTR = (key, subContent) => {

            const subUri = item.getUri() + '/' + key;

            const TR = document.createElement('TR');
            const TD_key = document.createElement('TD');
            const TD_value = document.createElement('TD');

            const INPUT_remove = document.createElement('INPUT');
            INPUT_remove.type = 'submit';
            //TODO add class
            INPUT_remove.value = 'x';
            INPUT_remove.onclick = () => {
                item.delete(key);
            };
            TD_key.appendChild(INPUT_remove);
            const TEXT_key = document.createTextNode(key);
            TD_key.appendChild(TEXT_key);

            const TAG = item.renderElement('edit', subUri, item.getStatus(), subContent, subSettings, subOptions);
            TD_value.appendChild(TAG);

            TR.appendChild(TD_key);
            TR.appendChild(TD_value);
            rows[key] = TR;
            TABLE.insertBefore(TR, TR_add);
        };
        if (typeof content === 'object' && content !== null) {
            for (let key in content) {
                const subContent = content[key];
                addTR(key, subContent);
            }
        }
        setupOnChange(item, rows, addTR);
        return TABLE;
    },
    view: function (item) {
        //TODO check if content is array
        const content = item.getContent();
        const subSettings = item.getSetting('subType');
        const subOptions = item.getOptions(); //TODO
        const TABLE = document.createElement('TABLE');
        const rows = {};
        const addTR = (key, subContent) => {
            const TR = document.createElement('TR');
            const TD_key = document.createElement('TD');
            const TD_value = document.createElement('TD');
            TD_key.innerText = key;
            TR.appendChild(TD_key);

            const subUri = item.getUri() + '/' + key;
            const TAG = item.renderElement('view', subUri, item.getStatus(), subContent, subSettings, subOptions);
            TD_value.appendChild(TAG);
            TR.appendChild(TD_value);
            rows[key] = TR;
            TABLE.appendChild(TR);
        };
        for (let key in content) {
            const subContent = content[key];
            addTR(key, subContent);
        }
        setupOnChange(item, rows, addTR);
        return TABLE;
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
            typeof subPropertyPath[0] === 'string'
    }
};