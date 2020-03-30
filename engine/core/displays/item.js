/*
options:

- showHeader
- showLabels
- showDeleteButton

 */

const list = require('./list.js');
const response = require('../../../factory/js/source/entity/response'); //TODO better solution

exports.display = {
    waitingForInput: display => {
        display.getWRAPPER().innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
        display.getWRAPPER().innerHTML = 'Waiting for data...';
    },
    empty: display => {
        display.getWRAPPER().innerHTML = 'No items to display.';
    },
    first: display => {
        display.getWRAPPER().innerHTML = '';
    },
    entity: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();

        let content = display.getContent();
        const path = display.getRequestUri().substr(1).split('/').slice(2);
        content = response.filter(content, path); //TODO move to before calling entity

        const columns = list.flatten(content, display.getRequestUri());

        const TABLE_entity = document.createElement('TABLE');
        TABLE_entity.className = 'xyz-item';
        TABLE_entity.entityId = entityId;
        const uri = '/' + entityClassName + '/' + entityId;
        if (display.getOption('showHeader') !== false) {
            const TR_header = document.createElement('TR');
            TR_header.className = 'xyz-item-header';
            const TD_header = document.createElement('TD');
            TD_header.innerHTML = uri;
            TD_header.setAttribute('colspan', display.getOption('showLabels') !== false ? '2' : '1');
            TR_header.appendChild(TD_header);
            TABLE_entity.appendChild(TR_header);
        }
        if (columns.constructor !== Object) {
            const node = columns;
            const TR_entity = document.createElement('TR');
            //todo name
            const TD_entityContent = document.createElement('TD');
            const TAG = node.render(display.getAction(), display.getOptions());
            TD_entityContent.appendChild(TAG);
            TR_entity.appendChild(TD_entityContent);
            TABLE_entity.appendChild(TR_entity);
        } else {

            for (let flatPropertyName in columns) {
                const TR_flatProperty = document.createElement('TR');

                if (display.getOption('showLabels') !== false) {
                    const TD_flatPropertyName = document.createElement('TD');
                    TD_flatPropertyName.innerHTML = flatPropertyName;
                    TR_flatProperty.appendChild(TD_flatPropertyName);
                }
                const TD_flatPropertyContent = document.createElement('TD');
                const node = columns[flatPropertyName];
                const TAG = node.render(display.getAction(), display.getOptions());
                TD_flatPropertyContent.appendChild(TAG);
                TR_flatProperty.appendChild(TD_flatPropertyContent);
                TABLE_entity.appendChild(TR_flatProperty);
            }
        }
        if (display.getOption('showDeleteButton') === true) {
            const TR_deleteButton = document.createElement('TR');
            const TD_deleteButton = document.createElement('TD');
            TD_deleteButton.setAttribute('colspan', 2);
            const INPUT_deleteButton = document.createElement('INPUT');
            INPUT_deleteButton.type = 'submit';
            INPUT_deleteButton.value = 'Delete';
            INPUT_deleteButton.onclick = () => {
                display.xyz.delete(uri); //TODO encapsulate xyz
            };
            TD_deleteButton.appendChild(INPUT_deleteButton);
            TR_deleteButton.appendChild(TD_deleteButton);
            TABLE_entity.appendChild(TR_deleteButton);
        }
        WRAPPER.appendChild(TABLE_entity);
    },
    remove: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        for (let TABLE_entity of WRAPPER.childNodes) {
            if (typeof TABLE_entity.entityId === 'string' && (TABLE_entity.entityId === entityId || entityId === '*')) {
                WRAPPER.removeChild(TABLE_entity);
            }
        }
    }
};

