const list = require('../list/list.js');

/*
TODO add radio flavor to provide radio box

options
- select
- flavor  dropdown|TODO radio
- showCreateButton
 */

exports.display = {
    waitingForInput: display => {
        display.getWRAPPER().innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
        display.getWRAPPER().innerHTML = 'Waiting for data...';
    },
    empty: display => {
        const WRAPPER = display.getWRAPPER();
        WRAPPER.innerHTML = '';
        const SELECT = document.createElement('SELECT');
        SELECT.className = 'xyz-select';
        SELECT.onchange = () => {
            const selectedUri = SELECT.options[SELECT.selectedIndex].value;
            const path = selectedUri.substr(1).split('/');
            const [entityClassName, entityId] = path;
            display.select(entityClassName, entityId);
        };
        if (!display.getOption('initialValue')) {
            const OPTION = document.createElement('OPTION');
            OPTION.innerText = 'Select...';
            OPTION.setAttribute('disabled', 'true');
            SELECT.appendChild(OPTION)
        }
        WRAPPER.appendChild(SELECT);
        const entityClassNameList = display.getRequestUri().substr(1).split('/')[0] || '*';
        const fullUri = '/' + entityClassNameList;
        list.showCreateButton(display);
    },
    first: display => {
        //TODO something with wrapper?
    },
    entity: display => {
        const WRAPPER = display.getWRAPPER();
        const columns = list.flatten(display.getContent());
        const SELECT = WRAPPER.firstChild;
        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();
        if (SELECT.childElementCount === 0 && !display.getOption('initialValue')) { // select the first option as default
            display.select(entityClassName, entityId);
        }

        const OPTION = document.createElement('OPTION');
        OPTION.value = '/' + entityClassName + '/' + entityId;
        if (typeof display.getOption('select') === 'string' && display.xyz.getVariable() === display.getOption('select')) { //TODO encapsulate xyz
            OPTION.selected = true;
        }
        if (display.getOption('initialValue') ===  OPTION.value) {
            display.select(entityClassName, entityId);
            OPTION.selected = true;
        }
        if (columns.constructor !== Object) {
            const node = columns;
            const TAG = node.render(display.getAction(), display.getOptions());
            OPTION.appendChild(TAG);
        } else {
            for (let flatPropertyName in columns) {
                const node = columns[flatPropertyName];
                const TAG = node.render(display.getAction(), display.getOptions());
                OPTION.appendChild(TAG);
            }
        }
        SELECT.appendChild(OPTION);
    },
    remove: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();
        const SELECT = WRAPPER.firstChild;
        for (let OPTION of SELECT.childNodes) {
            if ((OPTION.value === '/' + entityClassName + '/' + entityId || entityId === '*')) {
                SELECT.removeChild(OPTION);
            }
        }
    }
};