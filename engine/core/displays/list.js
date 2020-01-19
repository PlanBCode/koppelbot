/*

options
- select
- multiSelect
- addCreateButton
- TODO default
- TODO addDeleteButtons
- TODO addEditButtons
- TODO add multiselect tools
 */

function select(xyz, options, entityId) {
    if (typeof options.select === 'string') {
        xyz.setVariable(options.select, entityId);
    } else if (typeof options.select === 'function') {
        options.select(entityId);
    }
}

function flatten2(source, target, prefix) {
    if(source.constructor !== Object){
        return;
    }
    for (let key in source) {
        const value = source[key];
        if (value.constructor === Object) {
            flatten2(value, target, prefix + key + '.');
        } else {
            target[prefix + key] = value;
        }
    }
}

function flatten(source) {
    const target = {};
    flatten2(source, target, '');
    return target;
}

function addCreateButton(xyz, fullUri, WRAPPER, options) {
    //TODO only if has the permissions to add
    if (options.addCreateButton !== false) {
        const INPUT = document.createElement('INPUT');
        INPUT.type = "submit";
        //TODO add class
        INPUT.value = "+";
        INPUT.onclick = () => {
            if (DIV.style.display === 'none') {
                DIV.style.display = 'block';
                INPUT.value = "-";
            } else {
                INPUT.value = "+";
                DIV.style.display = 'none';
            }
        };
        WRAPPER.appendChild(INPUT);
        const DIV = document.createElement('DIV');
        DIV.style.display = 'none';
        const entityClassName = fullUri.substr(1).split('/')[0];
        xyz.ui('/' + entityClassName, {display: 'create'}, DIV);
        WRAPPER.appendChild(DIV);
    }
}

exports.display = {
    waitingForInput: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for input...';
    },
    waitingForData: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for data...';
    },
    empty: (xyz, action, options, WRAPPER, uri) => {
        WRAPPER.innerHTML = '';
        const TABLE = document.createElement('TABLE');
        TABLE.className = 'xyz-list';
        WRAPPER.appendChild(TABLE);
        addCreateButton(xyz, uri, WRAPPER, options);
    },
    first: (xyz, action, options, WRAPPER, entityId, content) => {
        const columns = flatten(content);
        const TR_header = document.createElement('TR');
        TR_header.className = 'xyz-list-header';
        if (options.multiSelect) {
            const TD_checkbox = document.createElement('TD');
            TR_header.appendChild(TD_checkbox);
        }
        for (let flatPropertyName in columns) {
            const TD_header = document.createElement('TD');
            TD_header.innerHTML = flatPropertyName;
            TR_header.appendChild(TD_header);
        }
        const TABLE = WRAPPER.firstChild;
        TABLE.appendChild(TR_header);
    },
    //TODO uri
    entity: (xyz, action, options, WRAPPER, entityId, content) => {
        const columns = flatten(content);
        const TR_entity = document.createElement('TR');
        TR_entity.className = 'xyz-list-item';

        if (options.multiSelect) {
            const variableName = options.multiSelect;
            const TD_checkbox = document.createElement('TD');
            const INPUT_checkbox = document.createElement('INPUT');
            INPUT_checkbox.type = "checkbox";
            INPUT_checkbox.onclick = event => {
                const entityIds = xyz.hasVariable(variableName)
                    ? xyz.getVariable(variableName).split(',')
                    : [];
                if (INPUT_checkbox.checked) {
                    if (!entityIds.includes(entityId)) {
                        entityIds.push(entityId);
                    }
                } else {
                    const index = entityIds.indexOf(entityId);
                    if (index !== -1) {
                        entityIds.splice(index, 1);
                    }
                }
                if (entityIds.length === 0) {
                    xyz.clearVariable(variableName);
                } else {
                    xyz.setVariable(variableName, entityIds.join(','));
                }
                event.stopPropagation();
            };
            TD_checkbox.appendChild(INPUT_checkbox);
            TR_entity.appendChild(TD_checkbox);
        }

        for (let flatPropertyName in columns) {
            const TD_flatProperty = document.createElement('TD');
            const node = columns[flatPropertyName];
            const TAG = node.render(action, options);
            TD_flatProperty.appendChild(TAG);
            TR_entity.appendChild(TD_flatProperty);
        }

        const TABLE = WRAPPER.firstChild;
        if (options.select) {
            if (xyz.getVariable(options.select) === entityId || options.default === entityId) {
                TR_entity.classList.add('xyz-list-selected');
            }
            TR_entity.onclick = () => {
                select(xyz, options, entityId);
                for (let row of TABLE.childNodes) {
                    if (row === TR_entity) {
                        row.classList.add('xyz-list-selected');
                    } else {
                        row.classList.remove('xyz-list-selected');
                    }
                }
            };
        }
        TABLE.appendChild(TR_entity);
    }
};

exports.addCreateButton = addCreateButton;
exports.flatten = flatten;