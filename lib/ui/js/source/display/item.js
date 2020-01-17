const list = require('./list.js');

exports.display = {
    waiting: (xyz, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for items...';
    },
    empty: (xyz, options, WRAPPER) => {
        WRAPPER.innerHTML = 'No items to display.';
    },
    first: (xyz, options, WRAPPER, entityId, content) => {},
    //TODO uri
    entity: (xyz, options, WRAPPER, entityId, content) => {
        const columns = list.flatten(content);
        const TABLE_entity = document.createElement('TR');
        TABLE_entity.className = 'xyz-item';

        for (let flatPropertyName in columns) {
            const TR_flatProperty = document.createElement('TR');
            const value = columns[flatPropertyName].getContent();
            const TD_flatPropertyName = document.createElement('TD');
            TD_flatPropertyName.innerHTML = flatPropertyName;

            const TD_flatPropertyValue = document.createElement('TD');
            TD_flatPropertyValue.innerHTML = value;//TODO render type

            TR_flatProperty.appendChild(TD_flatPropertyName);
            TR_flatProperty.appendChild(TD_flatPropertyValue);
            TABLE_entity.appendChild(TR_flatProperty);

        }

        WRAPPER.appendChild(TABLE_entity);
    }
};

