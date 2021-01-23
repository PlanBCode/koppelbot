const pathFromUri = uri => {
  uri = uri.split('?')[0]; // remove querystring
  if (uri.startsWith('/')) {
    uri = uri.substr(1);
  }
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }
  return uri.split('/');
};

const wrapContent = (uri, content) => {
  const wrapper = {};
  const path = pathFromUri(uri);
  let wrapperIterator = wrapper;
  for (let depth = 0; depth < path.length; ++depth) {
    const key = path[depth];
    wrapperIterator = wrapperIterator[key] = (depth === path.length - 1) ? content : {};
  }
  return wrapper;
};

const getEntityClassNames = (uri, entityClasses) => {
  const path = pathFromUri(uri);
  const entityClassNameList = path[0] || '*';
  if (entityClassNameList === '*') {
    return Object.keys(entityClasses);
  } else {
    return entityClassNameList.split(','); // TODO check if exist
  }
};

const getBaseUri = uri => {
  const path = pathFromUri(uri);
  if (path.length === 1) {
    return '/' + path[0] + '/*';
  } else if (path.length === 0) {
    console.error('PROBLEM ERROR'); // TODO
  } else {
    return '/' + path[0] + '/' + path[1];
  }
};

const addQueryString = (uri, queryString) => {
  return uri.indexOf('?') === -1
    ? uri + '?' + queryString
    : uri + '&' + queryString;
};

// '/$entityClassName/$entityId/sum(x),x' -> '/$entityClassName/$entityId/x,y'  and ['sum','x']
function parseAggregationFromUri (uri) {
  const aggregations = [];

  const path = pathFromUri(uri);
  if (path.length < 3 || path.length[2] === '*' || !path[2].includes('(')) return {uri, aggregations};
  const parts = path[2].split(',');
  const propertyNameList = [];

  for (let part of parts) { // TODO parse aggregations with multiple parameters?  "join(x,',')"
    if (part.endsWith(')')) {
      part = part.substr(0, part.length - 1); // 'sum(x)' -> 'sum(x'
      const aggregation = part.split('('); // 'sum(x' -> ['sum','x']
      const propertyName = aggregation[1];
      if (!propertyNameList.includes(propertyName)) propertyNameList.push(propertyName);
      aggregations.push(aggregation);
    } else if (!propertyNameList.includes(part)) propertyNameList.push(part);
  }
  uri = '/' + path.slice(0, 2).join('/') + '/' + propertyNameList.join(',');
  return {uri, aggregations};
}

exports.parseAggregationFromUri = parseAggregationFromUri;
exports.getBaseUri = getBaseUri;
exports.getEntityClassNames = getEntityClassNames;
exports.pathFromUri = pathFromUri;
exports.wrapContent = wrapContent;
exports.addQueryString = addQueryString;
