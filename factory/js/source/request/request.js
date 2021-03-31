const entity = require('../entity/entity.js');
const {setQueryParameter, getQueryParameter, multiSetQueryParameters, pathFromUri} = require('../uri/uri.js');

function request (method, uri, data, callback) {
  // TODO set content type and length headers
  // TODO allow for multiple hosts by prepending http(s)://..
  const location = window.location.origin + '/';

  uri = uri.split(';').map(requestUri => setQueryParameter(requestUri, 'expand', 'true')).join(';');
  uri = encodeURI(uri);
  const xhr = new window.XMLHttpRequest();
  xhr.open(method, location + 'api' + uri, true);

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
  const requestedEntityClassNames = uri.split(';') // '/a;/b' -> ['/a','/b,c']
    .map(requestUri => pathFromUri(requestUri)) //  -> [['a'],['b,c']]
    .map(requestPath => requestPath[0]) // ['a','b,c']
    .map(entityClassNameList => entityClassNameList.split(','))// [['a'],['b','c']]
    .flat() //  ['a','b',c]
    .filter(entityClassName => entityClassName !== '')
    // TODO unique?
    ;

  const entityClassNames = requestedEntityClassNames.filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));
  if (entityClassNames.length === 0) {
    callback();
  } else {
    const metaUri = setQueryParameter('/entity/' + entityClassNames.join(','), 'expand', 'true');
    request('GET', metaUri, undefined, (status, content) => { // TODO add querystring better
      // TODO check status
      // console.log(metaUri, content);
      let data;
      try {
        data = JSON.parse(content); // TODO check
      } catch (e) {
        console.log(content);
        console.error('PROBLEM parsing meta response', data);
        return;
      }
      if (typeof data !== 'object' || data === null || !data.hasOwnProperty('entity')) {
        console.error('PROBLEM parsing meta response', data);
        return;
      }
      const waitForEntityClassNames = new Set('*'); // add '*' to ensure callbacks being called correctly
      const metas = {};
      const waitForAllCallbacks = () => { // check if all reference meta's have been retrieved as well
        if (waitForEntityClassNames.size === 0) {
          for (const entityClassName in metas) {
            if (!entityClasses.hasOwnProperty(entityClassName)) {
              entityClasses[entityClassName] = new entity.Class(xyz, entityClassName, metas[entityClassName]);
            }
          }
          callback();
        }
      };
      for (const entityClassName of entityClassNames) {
        if (!entityClasses.hasOwnProperty(entityClassName)) {
          if (!data.entity.hasOwnProperty(entityClassName)) {
            console.error(`Entity data not found for '${entityClassName}'`);
            return;
          } else {
            const meta = data.entity[entityClassName].content; // TODO validate data
            metas[entityClassName] = meta;
            entityClasses[entityClassName] = new entity.Class(xyz, entityClassName, meta);

            for (const propertyName in meta) {
              const settings = meta[propertyName];
              if (settings.type === 'reference') {
                const referenceEntityClassName = settings.uri.split('/')[1]; // TODO check
                waitForEntityClassNames.add(referenceEntityClassName);
                retrieveMeta(xyz, entityClasses, '/' + referenceEntityClassName, () => {
                  waitForEntityClassNames.delete(referenceEntityClassName);
                  waitForAllCallbacks();
                });
              }
            }
          }
        }
      }
      waitForEntityClassNames.delete('*');
      waitForAllCallbacks();
    });
  }
};
exports.retrieveMeta = retrieveMeta;

exports.delete = (entityClasses, uri, callback) => {
  request('DELETE', uri, null, (status, response) => {
    // TODO handle multi requests
    // console.log('delete response: ' + uri + ' ' + response);
    const responseContent = JSON.parse(response);
    const state = entity.handleMultiInput('DELETE', uri, status, responseContent, null, entityClasses);
    if (typeof callback === 'function') callback(state);
  });
};

exports.head = (uri, callback) => {
  request('HEAD', uri, null, (status, response) => {
    // TODO handle multi requests?
    // console.log('head response: ' + uri + ' ' + status + ' ' + response);
    if (typeof callback === 'function') callback(status); // TODO pass state
  });
};

const handleModifyRequest = (entityClasses, method, uri, requestObjectContent, callback) => {
  const requestStringContent = JSON.stringify(requestObjectContent);
  // console.log(method + ' request: ' + uri + ' ' + requestStringContent);
  request(method, uri, requestStringContent, (status, responseStringContent) => {
    // TODO handle multi requests
    // console.log(method + ' response:' + responseStringContent, uri);
    let responseObjectContent;
    try {
      responseObjectContent = JSON.parse(responseStringContent);
    } catch (e) {
      console.log(responseStringContent);
      console.error(e);
      return;
    }
    const state = entity.handleMultiInput(method, uri, status, responseObjectContent, requestObjectContent, entityClasses);
    if (typeof callback === 'function') callback(state);
  });
};

exports.post = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'POST', uri, content, callback);
exports.patch = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'PATCH', uri, content, callback);
exports.put = (entityClasses, uri, content, callback) => handleModifyRequest(entityClasses, 'PUT', uri, content, callback);
const PAGE_SIZE = 1000;

function getMaxEntityCount (status, responseObjectContents) {
  let maxEntityCount = 0;
  for (const responseObjectContent of responseObjectContents) {
    for (const entityClassName in responseObjectContent) {
      // TODO check
      const entityClassContent = status === 207
        ? responseObjectContent[entityClassName].content
        : responseObjectContent[entityClassName];
      const entityIds = Object.keys(entityClassContent); // TODO check
      if (entityIds.length > maxEntityCount) maxEntityCount = entityIds.length;
    }
  }
  return maxEntityCount;
}
function getPartial (uri, entityClasses, dataCallback, originalOffset, originalLimit, offset) {
  if (typeof offset === 'undefined') offset = 0;
  if (typeof originalOffset === 'undefined') originalOffset = 0;
  const limit = typeof originalLimit === 'undefined' ? PAGE_SIZE : Math.min(PAGE_SIZE, originalLimit);
  uri = multiSetQueryParameters(uri, {limit, offset});
  request('GET', uri, undefined, (status, responseStringContent) => {
    let responseObjectContent;
    try {
      responseObjectContent = JSON.parse(responseStringContent);
    } catch (e) {
      console.error('GET', uri, responseStringContent, e);
      return;
    }

    entity.handleMultiInput('GET', uri, status, responseObjectContent, null, entityClasses);

    if (typeof dataCallback === 'function') dataCallback(); // TODO remove but still used by accessListener

    // determine if we need to get another page
    const isMultiRequest = (responseObjectContent instanceof Array) && uri.includes(';');
    const responseObjectContents = isMultiRequest ? responseObjectContent : [responseObjectContent];
    if (getMaxEntityCount(status, responseObjectContents) >= PAGE_SIZE) {
      getPartial(uri, entityClasses, dataCallback, originalOffset, originalLimit, offset + PAGE_SIZE);
    }
  });
}

// callback = Response =>{}
// get the requested uri from cache or request it from server
exports.get = (xyz, entityClasses, uri, dataCallback) => {
  retrieveMeta(xyz, entityClasses, uri, () => {
    // TODO meta should be good or we have a problem
    // TODO get the data from cache if already in cache
    const originalLimit = getQueryParameter(uri, 'limit');
    const originalOffset = getQueryParameter(uri, 'offset');
    getPartial(uri, entityClasses, dataCallback, originalLimit, originalOffset);
  });
};

exports.retrieveMeta = retrieveMeta;
