const PAGE_SIZE = 1000; // align with engine/api/api.php

const entity = require('../entity/entity.js');
const {setQueryParameter, getQueryParameter, multiSetQueryParameters, pathFromUri} = require('../uri/uri.js');
const {isClientSideEntityClass, clientSideRequest} = require('./clientside');
const pendingGets = {
  // uri -> {}
};
const pendingRequests = [];

function check207SubStatus (status, content) {
  if (status === 207) {
    if (typeof content !== 'object' ||
     content === null ||
     !content.hasOwnProperty('status') ||
   !content.hasOwnProperty('content') ||
   typeof content.content !== 'object'
    ) {
      console.error('Ill formated 207 response', content);
      return false;
    } else {
      if (content.content === null) return content.status >= 200 && content.status <= 299;
      for (const subKey in content.content) {
        if (!check207SubStatus(content.status, content.content[subKey])) return false;
      }
      return true;
    }
  } else return status >= 200 && status <= 299;
}

function check207Status (status, content) {
  console.log('checkStatus', status, content);
  if (status === 207) {
    if (typeof content !== 'object') {
      if (content === null) return status >= 200 && status <= 299;
      console.error('Ill formated 207 response', content);
      return false;
    } else {
      for (const key in content) {
        if (!check207SubStatus(status, content[key])) return false;
      }
      return true;
    }
  } else return status >= 200 && status <= 299;
}

function renderPendingRequestIndicator () {
  let DIV_pendingRequestIndicator = document.getElementById('xyz-pendingRequestIndicator');

  if (pendingRequests.length > 0) {
    if (!DIV_pendingRequestIndicator) {
      DIV_pendingRequestIndicator = document.createElement('DIV');
      const SPAN_pendingRequestProgress = document.createElement('SPAN');
      DIV_pendingRequestIndicator.appendChild(SPAN_pendingRequestProgress);
      const DIV_pendingRequestAnimation = document.createElement('DIV');
      DIV_pendingRequestIndicator.appendChild(DIV_pendingRequestAnimation);
      document.body.appendChild(DIV_pendingRequestIndicator);
    }
    DIV_pendingRequestIndicator.firstChild.innerHTML = '';// pendingRequests.length;

    DIV_pendingRequestIndicator.id = 'xyz-pendingRequestIndicator';
    DIV_pendingRequestIndicator.style.display = 'block';
  } else if (DIV_pendingRequestIndicator) DIV_pendingRequestIndicator.style.display = 'none';
}

function request (entityClasses, method, uri, requestContent, callback) {
  // TODO set content type and length headers
  // TODO allow for multiple hosts by prepending http(s)://..
  const location = window.location.origin + '/';

  renderPendingRequestIndicator();
  uri = uri.split(';').map(requestUri => setQueryParameter(requestUri, 'expand', 'true')).join(';');
  uri = encodeURI(uri);

  const entityClassName = uri.split('?')[0].split('/')[1];
  if (isClientSideEntityClass(entityClasses, entityClassName)) return clientSideRequest(entityClasses, method, uri, requestContent, callback);

  pendingRequests.push(uri);

  const xhr = new window.XMLHttpRequest();
  xhr.open(method, location + 'api' + uri, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      const status = xhr.status;
      const content = xhr.responseText;
      const index = pendingRequests.indexOf(uri);
      if (index !== -1) {
        pendingRequests.splice(index, 1);
        renderPendingRequestIndicator();
      }
      callback(status, content, header => xhr.getResponseHeader(header));
    }
  };
  xhr.send(requestContent);
}

const retrieveEntityClassMeta = (xyz, entityClasses, entityClassName, callback) => {
  const meta = xyz.metas[entityClassName];
  const referencedEntityClassNames = new Set();
  for (const propertyName in meta) {
    const settings = meta[propertyName];
    const moreReferencedEntityClassNames = getReferencedEntityClassNames(settings);
    for (const referenceEntityClassName of moreReferencedEntityClassNames) {
      if (entityClassName !== referenceEntityClassName && !xyz.metas.hasOwnProperty(referenceEntityClassName)) referencedEntityClassNames.add(referenceEntityClassName);
    }
  }
  if (referencedEntityClassNames.size === 0) callback();
  else retrieveMeta(xyz, entityClasses, '/' + [...referencedEntityClassNames].join(','), callback);
};

function getReferencedEntityClassNames (settings) {
  const referencedEntityClassNames = [];
  if (settings.hasOwnProperty('subType')) {
    referencedEntityClassNames.push(...getReferencedEntityClassNames(settings.subType));
  }
  if (settings.hasOwnProperty('keyType')) {
    referencedEntityClassNames.push(...getReferencedEntityClassNames(settings.keyType));
  }
  if (settings.type === 'reference') {
    const referenceEntityClassName = settings.uri.split('/')[1];
    referencedEntityClassNames.push(referenceEntityClassName);
  }
  return referencedEntityClassNames;
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
  const entityClassNames = requestedEntityClassNames.filter(entityClass => !entityClasses.hasOwnProperty(entityClass));
  if (entityClassNames.length === 0) callback();
  else {
    const metaUri = setQueryParameter('/entity/' + entityClassNames.join(','), 'expand', 'true');
    request(entityClasses, 'GET', metaUri, undefined, (status, content) => {
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

      const waitForAllCallbacks = () => { // check if all reference meta's have been retrieved as well
        for (const entityClassName of entityClassNames) {
          if (!xyz.metas.hasOwnProperty(entityClassName)) return;
        }
        for (const entityClassName of entityClassNames) {
          if (!entityClasses.hasOwnProperty(entityClassName)) {
            entityClasses[entityClassName] = new entity.Class(xyz, entityClassName, xyz.metas[entityClassName]);
          }
        }
        callback();
      };
      const moreReferencedEntityClassNames = [];
      for (const entityClassName of entityClassNames) {
        if (!data.entity.hasOwnProperty(entityClassName)) {
          console.error(`Entity data not found for '${entityClassName}'`);
          return;
        } else {
          const meta = data.entity[entityClassName].content; // TODO validate data
          for (const propertyName in meta) {
            const settings = meta[propertyName];
            moreReferencedEntityClassNames.push(...getReferencedEntityClassNames(settings));
          }
          xyz.metas[entityClassName] = meta;
        }
      }
      for (const entityClassName of moreReferencedEntityClassNames) {
        if (!xyz.hasOwnProperty(entityClassName) && !entityClassNames.includes(entityClassName)) entityClassNames.push(entityClassName);
      }
      for (const entityClassName of entityClassNames) {
        retrieveEntityClassMeta(xyz, entityClasses, entityClassName, waitForAllCallbacks);
      }
    });
  }
};
exports.retrieveMeta = retrieveMeta;

exports.delete = (entityClasses, uri, callback) => {
  request(entityClasses, 'DELETE', uri, null, (status, response) => {
    // TODO handle multi requests
    // console.log('delete response: ' + uri + ' ' + response);
    const responseContent = JSON.parse(response);
    const state = entity.handleMultiInput('DELETE', uri, status, responseContent, null, entityClasses);
    if (typeof callback === 'function') callback(state);
  });
};

exports.head = (entityClasses, uri, callback) => {
  request(entityClasses, 'HEAD', uri, null, (status, stringResponse) => {
    if (status === 207) {
      let response;
      try {
        response = JSON.parse(stringResponse);
      } catch (error) {
        console.error('Parsing error for HEAD response', error);
        status = 500;
      }
      status = check207Status(status, response) ? 200 : 404;
    }

    // TODO handle multi requests?
    // console.log('head response: ' + uri + ' ' + status + ' ' + response);
    if (typeof callback === 'function') callback(status); // TODO pass state
  });
};

const handleModifyRequest = (entityClasses, method, uri, requestObjectContent, callback) => {
  const requestStringContent = JSON.stringify(requestObjectContent);
  // console.log(method + ' request: ' + uri + ' ' + requestStringContent);
  request(entityClasses, method, uri, requestStringContent, (status, responseStringContent) => {
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

function getEntityCount (status, responseObjectContents) {
  let maxEntityPageCount = 0;
  let entityCount = 0;
  if (status >= 200 && status <= 299) {
    for (let requestId = 0; requestId < responseObjectContents.length; ++requestId) {
      const responseObjectContent = responseObjectContents[requestId];
      for (const entityClassName in responseObjectContent) {
        // TODO check
        const entityClassContent = status === 207
          ? responseObjectContent[entityClassName].content
          : responseObjectContent[entityClassName];
        const entityIds = Object.keys(entityClassContent); // TODO check

        const pageCount = entityIds.length;
        if (pageCount > maxEntityPageCount) maxEntityPageCount = pageCount;
        entityCount += pageCount;
      }
    }
  }
  return entityCount;
}

function getPartial (uri, entityClasses, dataCallback, originalUri, originalOffset, originalLimit, offset, page = 0) {
  if (typeof offset === 'undefined') offset = 0;
  if (typeof originalOffset === 'undefined') originalOffset = 0;
  const limit = typeof originalLimit === 'undefined' ? PAGE_SIZE : Math.min(PAGE_SIZE, originalLimit);
  const nextPageUri = multiSetQueryParameters(uri, {limit, offset});
  request(entityClasses, 'GET', nextPageUri, undefined, (status, responseStringContent, getResponseHeader) => {
    let responseObjectContent;
    try {
      responseObjectContent = JSON.parse(responseStringContent);
    } catch (e) {
      console.error('GET', nextPageUri, responseStringContent, e);
      return;
    }
    entity.handleMultiInput('GET', nextPageUri, status, responseObjectContent, null, entityClasses);

    if (typeof dataCallback === 'function') dataCallback(); // TODO remove but still used by accessListener

    // determine if we need to get another page
    const isMultiRequest = (responseObjectContent instanceof Array) && nextPageUri.includes(';');
    const responseObjectContents = isMultiRequest ? responseObjectContent : [responseObjectContent];
    const entityCount = getEntityCount(status, responseObjectContents, page, getResponseHeader);
    if (!pendingGets.hasOwnProperty(originalUri)) pendingGets[originalUri] = {};
    if (entityCount === PAGE_SIZE) { // could be more
      getPartial(originalUri, entityClasses, dataCallback, originalUri, originalOffset, originalLimit, offset + PAGE_SIZE, page + 1);
    } else {
      delete pendingGets[uri];
    }

    renderPendingRequestIndicator();
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
    pendingGets[uri] = {};
    getPartial(uri, entityClasses, dataCallback, uri, originalLimit, originalOffset);
  });
};

exports.retrieveMeta = retrieveMeta;
