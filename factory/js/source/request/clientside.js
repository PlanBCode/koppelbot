exports.isClientSideEntityClass = isClientSideEntityClass;

exports.clientSideRequest = clientSideRequest;

const connectors = require('../../build/connectors.js');

function isClientSideEntityClass (entityClasses, entityClassName) {
  if (!entityClasses.hasOwnProperty(entityClassName)) return false;
  else {
    const entityClass = entityClasses[entityClassName];
    const settings = entityClass.getSettings();
    for (const basePropertyName in settings) {
      const connectorType = settings[basePropertyName].connector.type;// TODO check
      if (connectors.hasOwnProperty(connectorType)) return true;
    }
  }
  return false;
}

function parseJsonOrUndefined (x) {
  return typeof x === 'undefined' ? undefined : JSON.parse(x);
}

function mergeContent (statusA, contentA, statusB, contentB) {
  if (typeof statusA === 'undefined') {
    for (const key in contentB) contentA[key] = contentB[key];
    return statusB;
  }

  if (statusA === 207 && statusB === 207) {
    for (const key in contentA) {
      if (contentB.hasOwnProperty(key)) {
        contentA[key].status = mergeContent(
          contentA[key].status, contentA[key].content,
          contentB[key].status, contentB[key].content
        );
      }
    }
    for (const key in contentB) {
      if (!contentA.hasOwnProperty(key)) contentA[key] = contentB[key];
    }
    return 207;
  } else if (statusA === statusB) {
    for (const key in contentA) {
      if (contentB.hasOwnProperty(key)) {
        mergeContent(statusA, contentA[key], statusB, contentB[key]);
      }
    }
    for (const key in contentB) {
      if (!contentA.hasOwnProperty(key)) contentA[key] = contentB[key];
    }
    return statusA;
  } else {
    console.error('Merge not yet implemented');
  }
}

function clientSideRequest (entityClasses, method, uri, requestContent, callback) {
  // todo multi requests
  method = method.toLowerCase();
  const [a, queryString] = uri.split('?');
  const path = a.substr(1).split('/');
  const entityClassName = path[0];
  const entityClass = entityClasses[entityClassName];
  const settings = entityClass.getSettings();
  let basePropertyNames;

  if (path.length < 3 || path[2] === '*') {
    if (method === 'head' || method === 'delete') basePropertyNames = [entityClass.getIdProperty()];
    else basePropertyNames = Object.keys(settings);
  } else basePropertyNames = path[2].split(',');

  const entityIdList = path[1] || '*';
  const content = {};
  let status;
  let count = 0;
  const combinedCallback = (subStatus, subContent) => {
    ++count;
    status = mergeContent(status, content, subStatus, subContent);
    if (count === basePropertyNames.length) callback(subStatus, JSON.stringify(content));
  };
  for (const basePropertyName of basePropertyNames) {
    const connectorSettings = settings[basePropertyName].connector;// TODO check
    const connectorType = connectorSettings.type;
    const connector = connectors[connectorType];
    connector[method](
      entityClassName,
      entityIdList,
      basePropertyName,
      connectorSettings,
      combinedCallback,
      parseJsonOrUndefined(requestContent)); //  TODO queryString
  }
}
