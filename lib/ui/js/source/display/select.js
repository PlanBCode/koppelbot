const list = require('./list.js');

/*
TODO add radio flavor to provide radio box

options
- select
- flavor  dropdown|TODO radio
- addCreateButton
 */

function select(xyz, options, entityId) {
    if (typeof options.select === 'string') {
        xyz.setVariable(options.select, entityId);
    } else if (typeof options.select === 'function') {
        options.select(entityId);
    }
}

exports.display = {
    waiting: (xyz, action, options, WRAPPER) => {
        WRAPPER.innerHTML = 'Waiting for items...';
    },
    empty: (xyz, action, options, WRAPPER, entityClassNameList) => {
        WRAPPER.innerHTML = '';
        const SELECT = document.createElement('SELECT');
        SELECT.className = 'xyz-select';
        SELECT.onchange = () => {
            const entityId = SELECT.options[SELECT.selectedIndex].value;
            select(xyz, options, entityId);
        };
        WRAPPER.appendChild(SELECT);
        const fullUri = '/' + entityClassNameList; //TODO this could be multiple classes
        list.addCreateButton(xyz, fullUri, WRAPPER, options);
    },
    first: (xyz, action, options, WRAPPER, entityId, content) => {
        //TODO something with wrapper?
    },

    entity: (xyz, action, options, WRAPPER, entityId, content) => {
        const columns = list.flatten(content);

        const SELECT = WRAPPER.firstChild;

        if (SELECT.childElementCount === 0 && !options.initialValue) { // select the first option as default TODO unless other default is defined
            select(xyz, options, entityId);
        }

        const OPTION = document.createElement('OPTION');
        if (options.initialValue === entityId) {
            select(xyz, options, entityId);
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