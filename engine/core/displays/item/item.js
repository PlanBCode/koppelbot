/*
options:

- showTitle
- showLabels
- showDeleteButton
- showEditbutton
 */

const list = require('../list/list.js');
const response = require('../../../../factory/js/source/entity/response'); //TODO better solution

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
        const showTitle = display.getOption('showTitle') !== false;
        const showEditButton = display.getOption('showEditButton') === true && display.getAction() !== 'edit';
        const showDeleteButton = display.getOption('showDeleteButton') === true && display.getAction() !== 'delete';
        const showCancelButton = display.getOption('cancel') && display.getAction() === 'edit';

        let TD_header;
        if (showTitle || showEditButton || showDeleteButton || showCancelButton) {
            const TR_header = document.createElement('TR');
            TR_header.className = 'xyz-item-header';
            TD_header = document.createElement('TD');
            TD_header.setAttribute('colspan', display.getOption('showLabels') !== false ? '2' : '1');
            TR_header.appendChild(TD_header);
            TABLE_entity.appendChild(TR_header);
        }

        if (showTitle) {
            TD_header.innerHTML += display.getTitle();
        }
        if (showDeleteButton) {
            const INPUT_deleteButton = document.createElement('INPUT');
            INPUT_deleteButton.classList.add('xyz-delete');
            INPUT_deleteButton.type = 'submit';
            INPUT_deleteButton.style.float = 'right';
            INPUT_deleteButton.value = 'Delete';
            INPUT_deleteButton.onclick = () => {
                display.xyz.delete(uri); //TODO encapsulate xyz
            };
            TD_header.appendChild(INPUT_deleteButton);
        }
        if (showCancelButton) {
            const INPUT_cancelButton = document.createElement('INPUT');
            INPUT_cancelButton.classList.add('xyz-edit');
            INPUT_cancelButton.type = 'submit';
            INPUT_cancelButton.value = 'Cancel';
            INPUT_cancelButton.style.float = 'right';
            const onCancel = display.getOption('cancel');
            if (typeof onCancel === 'function') INPUT_cancelButton.onclick = onCancel;
            TD_header.appendChild(INPUT_cancelButton);
        }

        if (showEditButton) {
            const DIV_edit = document.createElement('DIV');
            DIV_edit.style.display = 'none';
            WRAPPER.appendChild(DIV_edit);

            display.xyz.ui({
                display: 'item',
                action: 'edit',
                uri: display.getRequestUri(),
                showLabels: true,
                showDeleteButton,
                cancel: () => {
                    DIV_edit.style.display = 'none';
                    TABLE_entity.style.display = 'block';
                }
            }, DIV_edit);

            const INPUT_editButton = document.createElement('INPUT');
            INPUT_editButton.classList.add('xyz-edit');
            INPUT_editButton.type = 'submit';
            INPUT_editButton.value = 'Edit';
            INPUT_editButton.style.float = 'right';
            INPUT_editButton.onclick = () => {
                DIV_edit.style.display = 'block';
                TABLE_entity.style.display = 'none';
            };

            TD_header.appendChild(INPUT_editButton);
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
                    TD_flatPropertyName.innerHTML = display.getDisplayName(flatPropertyName.split('.'));
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
