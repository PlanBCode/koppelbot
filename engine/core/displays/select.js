const list = require('./list.js');

/*
TODO add radio flavor to provide radio box

options
- select
- flavor  dropdown|TODO radio
- addCreateButton
 */

exports.display = {
    waitingForInput: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for input...';
    },
    waitingForData: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for data...';
    },
    empty: (xyz, action, options, WRAPPER, uri) => {
        WRAPPER.innerHTML = '';
        const SELECT = document.createElement('SELECT');
        SELECT.className = 'xyz-select';
        SELECT.onchange = () => {
            const selectedUri = SELECT.options[SELECT.selectedIndex].value;
            const path = selectedUri.substr(1).split('/');
            const [entityClassName, entityId] = path;
            list.select(xyz, options.select, entityClassName, entityId);
        };
        if (!options.initialValue) {
            const OPTION = document.createElement('OPTION');
            OPTION.innerText = 'Select...';
            OPTION.disabled = true;
            SELECT.appendChild(OPTION)
        }
        WRAPPER.appendChild(SELECT);
        const entityClassNameList = uri.substr(1).split('/')[0] || '*';
        const fullUri = '/' + entityClassNameList;
        list.addCreateButton(xyz, fullUri, WRAPPER, options);
    },
    first: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        //TODO something with wrapper?
    },

    entity: (xyz, action, options, WRAPPER, entityClassName, entityId, content) => {
        const columns = list.flatten(content);

        const SELECT = WRAPPER.firstChild;

        if (SELECT.childElementCount === 0 && !options.initialValue) { // select the first option as default TODO unless other default is defined
            list.select(xyz, options, entityClassName, entityId);
        }

        const OPTION = document.createElement('OPTION');
        OPTION.value = '/' + entityClassName + '/' + entityId;
        if (typeof options.select === 'string' && xyz.getVariable() === options.select) {
            OPTION.selected = true;
        }
        if (options.initialValue === entityId) {
            list.select(xyz, options, entityClassName, entityId);
            OPTION.selected = true;
        }
        for (let flatPropertyName in columns) {
            const node = columns[flatPropertyName];
            const TAG = node.render(action, options);
            OPTION.appendChild(TAG);
        }

        SELECT.appendChild(OPTION);
    }
};