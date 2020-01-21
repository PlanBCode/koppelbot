exports.actions = {
    edit: function (item) {
        const TABLE = document.createElement('TABLE');
        TABLE.innerHTML = '';
        const TR_type = document.createElement('TR');
        const TD_typeLabel = document.createElement('TD');
        TD_typeLabel.innerText = 'Type';
        const TD_typeSelect = document.createElement('TD');
        const SELECT = document.createElement('SELECT');
        const OPTION = document.createElement('OPTION');
        OPTION.innerText = 'hello';
        SELECT.appendChild(OPTION);
        TD_typeSelect.appendChild(SELECT);
        TR_type.appendChild(TD_typeLabel);
        TR_type.appendChild(TD_typeSelect);
        TABLE.appendChild(TR_type);
        //TODO onchange

        item.get('/type', types => {
            const type = 'string'; // TODO get from item.getContent().type
            const settings = types.type[type].parameters.getContent();
            const content = item.getContent() || {};
            for (let key in settings) {
                const TR = document.createElement('TR');
                const TD_label = document.createElement('TD');
                const TD_value = document.createElement('TD');
                TD_label.innerText = key;
                const subUri = item.getUri() + '/' + key;
                const subSettings = settings[key];
                const subContent = content[key];
                const TAG = item.renderElement('edit', subUri, item.getStatus(), subContent, subSettings, {});
                TD_value.appendChild(TAG);
                TR.appendChild(TD_label);
                TR.appendChild(TD_value);
                TABLE.appendChild(TR);
            }
        });
        return TABLE;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        const onChange = item => {
            const settings = item.getContent();
            let text = '<b>';
            let first = true;
            text += (settings.type || 'string') + '</b>(';
            for (let key in settings) {
                if (key !== 'type') {
                    if (first) {
                        first = false;
                    } else {
                        text += ',';
                    }
                    text += key + ':' + JSON.stringify(settings[key]).replace(/"/g, '');
                }
            }
            text += ')';
            SPAN.innerHTML = text;
        };
        onChange(item);
        item.onChange(onChange);
        return SPAN;
    },
    validateContent: function (item) {
        //TODO should be 0 or null always?
        return true;//TODO
    },
    validateSubPropertyPath: function (subPropertyPath, settings) {
        return subPropertyPath instanceof Array;
    }
};