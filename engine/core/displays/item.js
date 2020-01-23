const list = require('./list.js');

exports.display = {
    waitingForInput: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for input...';
    },
    waitingForData: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for data...';
    },
    empty: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'No items to display.';
    },
    first: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        WRAPPER.innerHTML = '';
    },
    entity: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        const columns = list.flatten(content);
        const TABLE_entity = document.createElement('TABLE');
        TABLE_entity.className = 'xyz-item';
        const uri = '/' + entityClassName + '/' + entityId;
        if (options.showHeader !== false) {
            const TR_header = document.createElement('TR');
            TR_header.className = 'xyz-item-header';
            const TD_header = document.createElement('TD');
            TD_header.innerHTML = uri;
            TD_header.setAttribute('colspan', options.showLabel !== false ? 2 : 1);
            TR_header.appendChild(TD_header);
            TABLE_entity.appendChild(TR_header);
        }

        for (let flatPropertyName in columns) {
            const TR_flatProperty = document.createElement('TR');

            if (options.showLabel !== false) {
                const TD_flatPropertyName = document.createElement('TD');
                TD_flatPropertyName.innerHTML = flatPropertyName;
                TR_flatProperty.appendChild(TD_flatPropertyName);
            }
            const TD_flatPropertyContent = document.createElement('TD');
            const node = columns[flatPropertyName];
            const TAG = node.render(action, options);
            TD_flatPropertyContent.appendChild(TAG);
            TR_flatProperty.appendChild(TD_flatPropertyContent);
            TABLE_entity.appendChild(TR_flatProperty);
        }

        if (options.showDeleteButton === true) {
            const TR_deleteButton = document.createElement('TR');
            const TD_deleteButton = document.createElement('TD');
            TD_deleteButton.setAttribute('colspan', 2);
            const INPUT_deleteButton = document.createElement('INPUT');
            INPUT_deleteButton.type = 'submit';
            INPUT_deleteButton.value = 'Delete';
            INPUT_deleteButton.onclick = () => {
                xyz.delete(uri)
            };
            TD_deleteButton.appendChild(INPUT_deleteButton);
            TR_deleteButton.appendChild(TD_deleteButton);
            TABLE_entity.appendChild(TR_deleteButton);
        }
        WRAPPER.appendChild(TABLE_entity);
    }
};

