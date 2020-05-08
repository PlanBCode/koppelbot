/*
uri
onSubmit
TODO onFailure

 */

const request = require('../request/request.js');
const uriTools = require('../uri/uri.js');

const renderUiCreate = (xyz, entityClasses, options, TAG) => {
    const uri = options.uri;
    request.retrieveMeta(xyz, entityClasses, uri, () => {
        const entityClassName = uriTools.pathFromUri(uri)[0];
        const entityClass = entityClasses[entityClassName];
        const data = {};
        const INPUT_submit = document.createElement('INPUT');
        INPUT_submit.type = 'submit';
        INPUT_submit.value = options.createButtonText || 'Create ' + entityClassName;
        INPUT_submit.validUris = {};
        const SPAN_message = document.createElement('SPAN');

        const displayMessage = message => {
            SPAN_message.innerText = typeof message === 'undefined' ? '' : message;
        };

        let TABLE = entityClass.createCreator(options, data, INPUT_submit, displayMessage);

        INPUT_submit.onclick = () => {
            const displayCreatedMessage = () => displayMessage('Created');
            if (entityClass.isAutoIncremented()) {
                xyz.post(uri, {[entityClassName]: {'new': data}}, displayCreatedMessage);
            } else {
                const entityId = entityClass.getIdFromContent(data);
                xyz.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}}, displayCreatedMessage);
            }
            if (typeof options.onSubmit === 'function') {
                options.onSubmit(data);
            }
            const newData = {};
            const newTABLE = entityClass.createCreator(options, newData, INPUT_submit, displayMessage);
            TAG.insertBefore(newTABLE, TABLE);
            TAG.removeChild(TABLE);
            TABLE = newTABLE;
            displayMessage('Creating..');
        };

        TAG.appendChild(TABLE);
        TAG.appendChild(INPUT_submit);
        TAG.appendChild(SPAN_message);

    });
    return TAG;
};

exports.renderUiCreate = renderUiCreate;