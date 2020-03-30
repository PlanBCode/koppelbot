/*

options
- select
- multiSelect
- showHeaders
- addCreateButton
- createButtonText

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

function addCreateButton(display) {
    //TODO only if has the permissions to add
    if (display.getOption('addCreateButton') !== false) {
        const INPUT = document.createElement('INPUT');
        INPUT.type = "submit";
        //TODO add class
        INPUT.value = display.getOption('createButtonText') || "+";
        INPUT.onclick = () => {
            if (DIV.style.display === 'none') {
                DIV.style.display = 'block';
                INPUT.value = "-";
            } else {
                INPUT.value = display.getOption('createButtonText') || "+";
                DIV.style.display = 'none';
            }
        };
        const WRAPPER = display.getWRAPPER();
        WRAPPER.appendChild(INPUT);
        const DIV = document.createElement('DIV');
        DIV.style.display = 'none';
        const entityClassName = display.getEntityClassName();
        display.xyz.ui({uri: '/' + entityClassName, display: 'create'}, DIV); // TODO encapsulate xyz
        WRAPPER.appendChild(DIV);
    }
}

exports.display = {
    waitingForInput: display => {
        const WRAPPER = display.getWRAPPER();
        WRAPPER.innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
        const WRAPPER = display.getWRAPPER();
        WRAPPER.innerHTML = 'Waiting for data...';
    },
    empty: display => {
        const WRAPPER = display.getWRAPPER();
        WRAPPER.innerHTML = '';
        const TABLE = document.createElement('TABLE');
        TABLE.className = 'xyz-list';
        WRAPPER.appendChild(TABLE);
        addCreateButton(display);
    },
    first: display => {
        if (display.getOption('showHeader') !== false) {
            const WRAPPER = display.getWRAPPER();
            const content = display.getContent();
            const columns = flatten(content);
            const TABLE = WRAPPER.firstChild;
            const TR_header = document.createElement('TR');
            TR_header.className = 'xyz-list-header';
            if (display.getOption('multiSelect')) {
                const TD_checkbox = document.createElement('TD');
                TR_header.appendChild(TD_checkbox);
            }
            if (columns.constructor !== Object) {
                const TD_header = document.createElement('TD');
                TD_header.innerHTML = display.getEntityClassName();
                TR_header.appendChild(TD_header);
            } else {
                for (let flatPropertyName in columns) {
                    const TD_header = document.createElement('TD');
                    TD_header.innerHTML = flatPropertyName;
                    TR_header.appendChild(TD_header);
                }
            }
            TABLE.appendChild(TR_header);
        }
    },

    entity: display => {
        const WRAPPER = display.getWRAPPER();
        const content = display.getContent();

        const columns = flatten(content);
        const TR_entity = document.createElement('TR');
        TR_entity.className = 'xyz-list-item';
        TR_entity.entityId = display.getEntityId();
        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();
        const uri = '/' + entityClassName+ '/' + entityId;

        if (display.getOption('multiSelect')) {
            const variableName = display.getOption('multiSelect');
            const TD_checkbox = document.createElement('TD');
            const INPUT_checkbox = document.createElement('INPUT');
            INPUT_checkbox.type = "checkbox";
            const selectedUris = getUrisFromVariable(display.xyz, variableName, entityClassName); // TODO encapsulate xyz

            if (selectedUris.includes(uri)) {
                INPUT_checkbox.checked = true;
            }

            INPUT_checkbox.onclick = event => {
                const selectedUris = getUrisFromVariable(display.xyz, variableName, entityClassName); // TODO encapsulate xyz
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
                    select(display.xyz, variableName, undefined, undefined)// TODO encapsulate xyz
                } else {
                    select(display.xyz, variableName, entityClassName, entityIds.join(','))// TODO encapsulate xyz
                }
                event.stopPropagation();
            };
            TD_checkbox.appendChild(INPUT_checkbox);
            TR_entity.appendChild(TD_checkbox);
        }
        if (columns.constructor !== Object) {
            const node = columns;
            const TD_entityContent = document.createElement('TD');
            const TAG = node.render(display.getAction(), display.getOptions());
            TD_entityContent.appendChild(TAG);
            TR_entity.appendChild(TD_entityContent);
        } else {
            for (let flatPropertyName in columns) {
                const TD_flatProperty = document.createElement('TD');
                const node = columns[flatPropertyName];
                const TAG = node.render(display.getAction(), display.getOptions());
                TD_flatProperty.appendChild(TAG);
                TR_entity.appendChild(TD_flatProperty);
            }
        }

        const TABLE = WRAPPER.firstChild;
        if (display.getOption('select')) {

            if (display.xyz.getVariable(display.getOption('select')) === uri || display.getOption('default') === entityId) { // TODO encapsulate xyz
                TR_entity.classList.add('xyz-list-selected');
            }
            TR_entity.onclick = () => {
                select(display.xyz, display.getOption('select'), entityClassName, entityId); // TODO encapsulate xyz
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
    },
    remove: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        const TABLE = WRAPPER.firstChild;
        for (let TR_entity of TABLE.childNodes) {
            if (typeof TR_entity.entityId === 'string' && (TR_entity.entityId === entityId || entityId === '*')) {
                TABLE.removeChild(TR_entity);
            }
        }
    }
};

exports.addCreateButton = addCreateButton;
exports.flatten = flatten;
exports.select = select;