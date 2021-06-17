/*
uri

TODO onFailure

 */

const request = require('../request/request.js');
const uriTools = require('../uri/uri.js');

const renderUiCreate = (xyz, entityClasses, options, TAG) => {
  const uri = options.uri;
  request.retrieveMeta(xyz, entityClasses, uri, () => {
    const entityClassName = uriTools.pathFromUri(uri)[0];
    const entityClass = entityClasses[entityClassName];
    const data = {}; // TODO add defaults (also below for reset data)  /fruit/*?color==green
    const INPUT_submit = document.createElement('INPUT');
    INPUT_submit.type = 'submit';
    INPUT_submit.value = options.createButtonText || 'Add ' + entityClassName;
    INPUT_submit.validUris = {};
    const SPAN_message = document.createElement('SPAN');

    const displayMessage = (message, error) => {
      if (error) console.error(error);
      // TODO use error to change styling of message
      SPAN_message.innerText = typeof message === 'undefined' ? '' : message;
    };

    let TABLE = entityClass.createCreator(options, data, INPUT_submit, displayMessage);
    const patch = newData => {
      // TODO check newData
      for (const key in data) delete data[key]; // reset data  //TODO add defaults
      for (const key in newData) data[key] = newData[key];
      const newTABLE = entityClass.createCreator(options, data, INPUT_submit, displayMessage);
      TAG.insertBefore(newTABLE, TABLE);
      TAG.removeChild(TABLE);
      TABLE = newTABLE;
    };
    INPUT_submit.onclick = () => {
      const displayCreatedMessage = state => {
        if (state.hasErrors()) {
          const errorMessages = state.getErrors().map(error => error.message);
          const errorString = [...new Set(errorMessages)]; // make unique
          displayMessage('Failed to create: ' + errorString, true);
        } else {
          displayMessage('Created');
          patch({}); // reset
        }
      };
      if (entityClass.isAutoIncremented()) { // POST
        displayMessage('Creating...');
        xyz.post(uri, {[entityClassName]: {new: data}}, displayCreatedMessage);
      } else { // PUT
        const entityId = entityClass.getIdFromContent(data);
        displayMessage('Creating...');
        xyz.head(uri + '/' + entityId, status => {
          if (status == 404) { // only if entity does not yet exist
            xyz.put(uri + '/' + entityId, {[entityClassName]: {[entityId]: data}}, displayCreatedMessage);
            if (typeof options.onSubmit === 'function') options.onSubmit(data);
          } else displayMessage('Failed: ' + entityId + ' already exists.');
        });
      }
    };
    TAG.patch = (...args) => { console.log('TAG.patch', args); patch(...args); };
    TAG.appendChild(TABLE);
    TAG.appendChild(INPUT_submit);
    TAG.appendChild(SPAN_message);
  });
  return TAG;
};

exports.renderUiCreate = renderUiCreate;
