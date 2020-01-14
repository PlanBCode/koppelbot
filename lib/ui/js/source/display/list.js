exports.render = (options, xyz) => (PARENT, TAG, key, uri, status, depth, primitive) => {
    if (depth === 0) {
        const TABLE = document.createElement('TABLE');
        TABLE.className = 'xyz-list';
        const TR_header = document.createElement('TR');
        TR_header.className = 'xyz-list-header';
        if (options.multiSelect) {
            const TD = document.createElement('TD');
            TR_header.appendChild(TD);
        }
        TABLE.appendChild(TR_header);
        PARENT.appendChild(TABLE);
        return TABLE;
    } else if (depth === 2) {
        const TABLE = PARENT;
        const entityId = key;
        const TR = document.createElement('TR');
        TR.className = 'xyz-list-item';
        if (options.multiSelect) {
            const variableName = options.multiSelect;
            const TD = document.createElement('TD');
            const INPUT = document.createElement('INPUT');
            INPUT.type = "checkbox";
            INPUT.onclick = event => {
                const entityIds = xyz.hasVariable(variableName)
                    ? xyz.getVariable(variableName).split(',')
                    : [];
                if (INPUT.checked) {
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
            TD.appendChild(INPUT);
            TR.appendChild(TD);
        }
        if (options.select) {
            if (xyz.getVariable(options.select) === entityId) {
                TR.classList.add('xyz-list-selected');
            }
            TR.onclick = () => {
                xyz.setVariable(options.select, entityId);
                for (let row of TABLE.childNodes) {
                    if (row === TR) {
                        row.classList.add('xyz-list-selected');
                    } else {
                        row.classList.remove('xyz-list-selected');
                    }
                }
            };
        }
        TABLE.appendChild(TR);
        return TR;
    } else if (primitive) {
        const TR = PARENT;
        const TABLE = TR.parentNode;
        const TR_header = TABLE.firstChild;
        let found = false;
        for (let TD_header of TR_header.childNodes) {
            if (TD_header.innerHTML === key) {
                found = true;
                break;
            }
        }
        if (!found) {
            const TD_header = document.createElement('TD');
            TD_header.innerHTML = key;
            TR_header.appendChild(TD_header);
        }
        const TD = document.createElement('TD');
        TD.appendChild(TAG);
        TR.appendChild(TD);
        return null;
    } else {
        return PARENT;
    }
};