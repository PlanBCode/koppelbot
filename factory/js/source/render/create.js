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
        const data = {}; //TODO add defaults (also below for reset data)  /fruit/*?color==green
        const INPUT_submit = document.createElement('INPUT');
        INPUT_submit.type = 'submit';
        INPUT_submit.value = options.createButtonText || 'Add ' + entityClassName;
        INPUT_submit.validUris = {};
        const SPAN_message = document.createElement('SPAN');

        const displayMessage = (message, error) => {
            //TODO use error to change styling of message
            SPAN_message.innerText = typeof message === 'undefined' ? '' : message;
        };

        let TABLE = entityClass.createCreator(options, data, INPUT_submit, displayMessage);

        INPUT_submit.onclick = () => {
            const displayCreatedMessage = state => {
                if (state.hasErrors()) {
                    const errorMessages = state.getErrors().map(error => error.message);
                    const errorString = [...new Set(errorMessages)]; // make unique
                    displayMessage('Failed to create: ' + errorString, true);
                } else {
                    displayMessage('Created');
                    for (let key in data) delete data[key]; // reset data  //TODO add defaults

                    const newTABLE = entityClass.createCreator(options, data, INPUT_submit, displayMessage);
                    TAG.insertBefore(newTABLE, TABLE);
                    TAG.removeChild(TABLE);
                    TABLE = newTABLE;
                }
            }
            if (entityClass.isAutoIncremented()) { // POST
                xyz.post(uri, {[entityClassName]: {'new': data}}, displayCreatedMessage);
            } else { // PUT
                const entityId = entityClass.getIdFromContent(data);
                xyz.head(uri + '/' + entityId, status => {
                    if (status === 404) {
                        xyz.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}}, displayCreatedMessage);
                    } else {
                        displayMessage('Failed: ' + entityId + ' already exists.');
                    }
                })
            }
            displayMessage('Creating..');
            if (typeof options.onSubmit === 'function') options.onSubmit(data);
        };

        TAG.appendChild(TABLE);
        TAG.appendChild(INPUT_submit);
        TAG.appendChild(SPAN_message);

    });
    return TAG;
};

exports.renderUiCreate = renderUiCreate;