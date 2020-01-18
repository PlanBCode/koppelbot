const list = require('./list.js');

exports.display = {
    waiting: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for items...';
    },
    empty: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'No items to display.';
    },
    first: (xyz, action, options, WRAPPER, entityId, content) => {
        WRAPPER.innerHTML = '';
    },
    entity: (xyz, action, options, WRAPPER, entityId, content) => {
        const columns = list.flatten(content);
        const TABLE_entity = document.createElement('TR');
        TABLE_entity.className = 'xyz-item';

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
        WRAPPER.appendChild(TABLE_entity);
    }
};

