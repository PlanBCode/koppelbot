const entity = require('../entity/entity.js');
const {addQueryString, pathFromUri} = require('../uri/uri.js');

function request (method, uri, data, callback) {
  // TODO set content type and length headers
  // TODO allow for multiple hosts by prepending http(s)://..
  const location = window.location.origin + '/';
  uri = encodeURI(uri);
  const xhr = new window.XMLHttpRequest();
  xhr.open(method, location + 'api' + addQueryString(uri, 'expand'), true);

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      const status = xhr.status;
      const content = xhr.responseText;
      callback(status, content);
    }
  };
  xhr.send(data);
}

const retrieveMeta = (xyz, entityClasses, uri, callback) => {
  const path = pathFromUri(uri);
  const entityClassNameList = path[0]; // TODO error if no entityClass

  const entityClassNames = entityClassNameList.split(',').filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));
  if (entityClassNames.length === 0) {
    callback();
  } else {
    const metaUri = addQueryString('/entity/' + entityClassNames.join(','), 'expand');
    request('GET', metaUri, undefined, (status, content) => { // TODO add querystring better
      // TODO check status
      console.log(metaUri, content);
      const data = JSON.parse(content); // TODO check
      if (typeof data !== 'object' || data === null || !data.hasOwnProperty('entity')) {
        console.error('PROBLEM parsing meta response', data);
        return;
      }
      for (const entityClassName of entityClassNames) {
        if (!entityClasses.hasOwnProperty(entityClassName)) {
          if (!data.entity.hasOwnProperty(entityClassName)) {
            console.error(`Entity data not found for '${entityClassName}'`);
            return;
          } else {
            const metaData = data.entity[entityClassName].content; // TODO validate data
            entityClasses[entityClassName] = new entity.Class(xyz, entityClassName, metaData);
          }
        }
      }
      callback();
    });
  }
};

exports.delete = (entityClasses, uri, callback) => {
  request('DELETE', uri, null, (status, response) => {
    console.log('delete response: ' + uri + ' ' + response);
    const responseContent = JSON.parse(response);
    const state = entity.handleInput('DELETE', uri, status, responseContent, null, entityClasses);
    if (typeof callback === 'function') callback(state);
  });
};

exports.head = (uri, callback) => {
  request('HEAD', uri, null, (status, response) => {
    console.log('head response: ' + uri + ' ' + status + ' ' + response);
    if (typeof callback === 'function') callback(status); // TODO pass state
  });
};

const handleModifyRequest = (entityClasses, method, uri, requestObjectContent, callback) => {
  const requestStringContent = JSON.stringify(requestObjectContent);
  console.log(method + ' request: ' + uri + ' ' + requestStringContent);
  request(method, uri, requestStringContent, (status, responseStringContent) => {
    console.log(method + ' response:' + responseStringContent, uri);
    const responseObjectContent = JSON.parse(responseStringContent);
    const state = entity.handleInput(method, uri, status, responseObjectContent, requestObjectContent, entityClasses);
    if (typeof callback === 'function') callback(state);
  });
};

exports.post = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'POST', uri, content, callback);
exports.patch = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'PATCH', uri, content, callback);
exports.put = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'PUT', uri, content, callback);

// callback = Response =>{}
// get the requested uri from cache or request it from server
exports.get = (xyz, entityClasses, uri, dataCallback, metaCallBack) => {
  retrieveMeta(xyz, entityClasses, uri, () => {
    if (typeof metaCallBack === 'function') metaCallBack();

    // TODO meta should be good or we have a problem
    // TODO get the data from cache if already in cache
    request('GET', uri, undefined, (status, responseStringContent) => {
      let responseObjectContent;
      try {
        responseObjectContent = JSON.parse(responseStringContent);
      } catch (e) {
        console.error('GET', uri, responseStringContent, e);
      }
      // console.log('GET', uri, status, responseObjectContent);
      // TODO replace null with current content?
      const state = entity.handleInput('GET', uri, status, responseObjectContent, null, entityClasses);
      // TODO  word er nog iets met state gedaan...?
      if (typeof dataCallback === 'function') {
        const node = entity.getResponse(uri, entityClasses, 'GET');
        dataCallback(node);
      }
    });
  });
};

exports.retrieveMeta = retrieveMeta;
