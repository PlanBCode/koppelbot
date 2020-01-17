exports.render = (options, xyz) => (PARENT, TAG, key, uri, status, depth, primitive, fullUri) => {
    if (depth === 0) {
        const TABLE = document.createElement('TABLE');
        PARENT.appendChild(TABLE);
        return TABLE;
    } else if (primitive) {
        const TR = document.createElement('TR');
        if (options.showLabel !== false) {
            const TD_label = document.createElement('TD');
            TD_label.innerHTML = key;
            TR.appendChild(TD_label);
        }
        const TD_content = document.createElement('TD');
        TD_content.appendChild(TAG);
        TR.appendChild(TD_content);
        PARENT.appendChild(TR);
        return null;
    } else {
        return PARENT;
    }
};


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
        console.log('a');
        const columns = flatten(content);
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

