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

function select(xyz, variableNameOrCallback, entityClassName, entityId) {
    if (typeof variableNameOrCallback === 'string') {
        if (typeof entityId === 'undefined' && typeof entityClassName === 'undefined') {
            xyz.clearVariable(variableNameOrCallback);
        } else {
            xyz.setVariable(variableNameOrCallback, '/' + entityClassName + '/' + entityId);
        }
    } else if (typeof variableNameOrCallback === 'function') {
        variableNameOrCallback(entityClassName, entityId);
    }
}

function getUrisFromVariable(xyz, variableName, entityClassName) {
    if (!xyz.hasVariable(variableName)) {
        return [];
    }
    return xyz.getVariable(variableName).split(',')  // "/fruit/apple,pear" => ["/fruit/apple","/fruit/pear"]
        .map(uri => uri.split('/'))
        .map(path => ('/' + entityClassName + '/' + path[path.length - 1]));
}

function flatten2(source, target, prefix) {
    if (source.constructor !== Object) return;
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
    if (source.constructor !== Object) return source;
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
    first: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        const columns = flatten(content);
        const TR_header = document.createElement('TR');
        TR_header.className = 'xyz-list-header';
        if (options.multiSelect) {
            const TD_checkbox = document.createElement('TD');
            TR_header.appendChild(TD_checkbox);
        }
        if (columns.constructor !== Object) {
            const TD_header = document.createElement('TD');
            TD_header.innerHTML = entityClassName;
            TR_header.appendChild(TD_header);
        } else {
            for (let flatPropertyName in columns) {
                const TD_header = document.createElement('TD');
                TD_header.innerHTML = flatPropertyName;
                TR_header.appendChild(TD_header);
            }
        }
        const TABLE = WRAPPER.firstChild;
        TABLE.appendChild(TR_header);
    },
    //TODO uri
    entity: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        const columns = flatten(content);
        const TR_entity = document.createElement('TR');
        TR_entity.className = 'xyz-list-item';
        const uri = '/' + entityClassName + '/' + entityId;

        if (options.multiSelect) {
            const variableName = options.multiSelect;
            const TD_checkbox = document.createElement('TD');
            const INPUT_checkbox = document.createElement('INPUT');
            INPUT_checkbox.type = "checkbox";
            const selectedUris = getUrisFromVariable(xyz, variableName, entityClassName);

            if (selectedUris.includes(uri)) {
                INPUT_checkbox.checked = true;
            }

            INPUT_checkbox.onclick = event => {
                const selectedUris = getUrisFromVariable(xyz, variableName, entityClassName);
                if (INPUT_checkbox.checked) {
                    if (!selectedUris.includes(uri)) {
                        selectedUris.push(uri);
                    }
                } else {
                    const index = selectedUris.indexOf(uri);
                    if (index !== -1) {
                        selectedUris.splice(index, 1);
                    }
                }
                const entityIds = selectedUris
                    .map(uri => uri.substr(1).split('/'))
                    .filter(path => path[0] === entityClassName)
                    .map(path => path[1]);
                if (entityIds.length === 0) {
                    select(xyz, variableName, undefined, undefined)
                } else {
                    select(xyz, variableName, entityClassName, entityIds.join(','))
                }
                event.stopPropagation();
            };
            TD_checkbox.appendChild(INPUT_checkbox);
            TR_entity.appendChild(TD_checkbox);
        }
        if (columns.constructor !== Object) {
            const node = columns;
            const TD_entityContent = document.createElement('TD');
            const TAG = node.render(action, options);
            TD_entityContent.appendChild(TAG);
            TR_entity.appendChild(TD_entityContent);
        } else {
            for (let flatPropertyName in columns) {
                const TD_flatProperty = document.createElement('TD');
                const node = columns[flatPropertyName];
                const TAG = node.render(action, options);
                TD_flatProperty.appendChild(TAG);
                TR_entity.appendChild(TD_flatProperty);
            }
        }

        const TABLE = WRAPPER.firstChild;
        if (options.select) {

            if (xyz.getVariable(options.select) === uri || options.default === entityId) {
                TR_entity.classList.add('xyz-list-selected');
            }
            TR_entity.onclick = () => {
                select(xyz, options.select, entityClassName, entityId);
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
exports.select = select;