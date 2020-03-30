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
        INPUT_submit.onclick = () => {
            if (entityClass.isAutoIncremented()) {
                xyz.post(uri, {[entityClassName]: {'new': data}},);
            } else {
                const entityId = entityClass.getIdFromContent(data);
                xyz.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}},);
            }
            if (typeof options.onSubmit === 'function') {
                options.onSubmit(data);
            }
        };
        const TABLE = entityClass.createCreator(options, data, INPUT_submit);
        TAG.appendChild(TABLE);
        TAG.appendChild(INPUT_submit);
    });
    return TAG;
};

exports.renderUiCreate = renderUiCreate;