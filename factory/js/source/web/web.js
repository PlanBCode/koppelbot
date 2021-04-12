const setCookie = function (keyValues, expiresInDays) {
  const date = new Date();
  date.setTime(date.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
  const expires = 'expires=' + date.toUTCString();
  for (const key in keyValues) { document.cookie = key + '=' + keyValues[key] + ';' + expires + ';path=/'; }
};

const getCookie = function () {
  if (document.cookie === '') return null;
  const keyValuesPairs = document.cookie.split(';');
  const cookie = {};
  for (const keyValuePair of keyValuesPairs) {
    const [key, value] = keyValuePair.split('=');
    cookie[key.trim()] = value.trim();
  }
  return cookie;
};

exports.getCookieValue = key => {
  const cookie = getCookie();
  return cookie === null ? null : cookie[key];
};

exports.setCookieValue = (key, value) => {
  let cookie = getCookie();
  if (cookie === null) cookie = {};
  cookie[key] = value;
  setCookie(cookie);
};

exports.getCookie = getCookie;
exports.setCookie = setCookie;

function getQueryParameters (filter = false, queryString = undefined) {
  const queryParameters = {};
  (typeof queryString === 'undefined' ? window.location.search : queryString)
    .substr(1) // '?a=1&b=2' -> 'a=1&b=2'
    .split('&') // ['a=1','b=2']
    .filter(x => x !== '')
    .forEach(keyValuePair => {
      const [key, operator, value] = splitKeyValuePair(keyValuePair); // 'a=1' -> ['a','=','1']
      if (operator === '=' && !filter) queryParameters[decodeURIComponent(key)] = decodeURIComponent(value);
      else if (!operator && !filter) queryParameters[decodeURIComponent(key)] = 'true';
      else if (operator !== '=' && filter) queryParameters[decodeURIComponent(key)] = [operator, decodeURIComponent(value)];
    });
  return queryParameters;
}

exports.getQueryFilters = (queryString = undefined) => getQueryParameters(true, queryString);

exports.getQueryParameters = (queryString = undefined) => getQueryParameters(false, queryString);
exports.getQueryParameter = (queryParameterName, queryString = undefined) => getQueryParameters(false, queryString)[queryParameterName];

function splitKeyValuePair (keyValueString) { // 'a=1' -> ['a','=','1']
  const keyValuePair = /^(?<key>[*,:;$%\w.-]+)(?<operator>[^*,:;$%\w.-]+)?(?<value>[*,:;$%\w.-]*)?$/.exec(keyValueString);
  if (keyValuePair !== null) return keyValuePair.slice(1);
  console.error('Failed to parse query key value pair: "' + keyValueString + '"');
  return [];
}

function updateQueryParameter (queryParameterName, value, operator = '=', queryString) {
  const keyValuePairs = queryString.split('&').filter(x => x !== ''); // 'a=1&b=2' -> ['a=1','b=2']

  let found = false;
  let changed = false;
  for (let i = 0; i < keyValuePairs.length; ++i) {
    const [otherKey, otherOperator, otherValue] = splitKeyValuePair(keyValuePairs[i]); // 'a=1' -> ['a','=']
    if (otherKey === encodeURIComponent(queryParameterName) && (otherOperator === operator || (operator === '=' && !otherOperator))) {
      if (found || typeof value === 'undefined' || value === '') keyValuePairs.splice(i, 1); // remove keyValuePair (for undefined and duplicates)
      else if (operator === '=' && (value === 'true' || value === true)) keyValuePairs[i] = encodeURIComponent(queryParameterName);
      else keyValuePairs[i] = [encodeURIComponent(queryParameterName), encodeURIComponent(value)].join(operator); // 'a=value'
      found = true;
      if (encodeURIComponent(value) !== otherValue) changed = true;
    }
  }

  if (!found && typeof value !== 'undefined') {
    if (operator === '=' && (value === 'true' || value === true)) keyValuePairs.push(encodeURIComponent(queryParameterName));
    else keyValuePairs.push([encodeURIComponent(queryParameterName), encodeURIComponent(value)].join(operator));
    changed = true;
  }

  return [changed, keyValuePairs.join('&')];
}

exports.setQueryParameters = function (queryParameters, operator = '=', queryString = undefined) {
  let useDocumentQueryString = false;
  if (typeof queryString === 'undefined') {
    useDocumentQueryString = true;
    queryString = document.location.search.substr(1); // '?a=1&b=2' -> 'a=1&b=2'
  }

  let changed = false;
  let updatedQueryString = queryString;
  for (const queryParameterName in queryParameters) {
    const value = queryParameters[queryParameterName];
    let subChanged;
    [subChanged, updatedQueryString] = updateQueryParameter(queryParameterName, value, operator, queryString);
    if (subChanged) changed = true;
  }

  if (changed && useDocumentQueryString) {
    const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + (updatedQueryString === '' ? '' : '?' + updatedQueryString);
    window.history.pushState({path: newUrl}, '', newUrl);
  }
  return updatedQueryString;
};

exports.setQueryParameter = function (queryParameterName, value, operator = '=', queryString = undefined) {
  let useDocumentQueryString = false;
  if (typeof queryString === 'undefined') {
    useDocumentQueryString = true;
    queryString = document.location.search.substr(1); // '?a=1&b=2' -> 'a=1&b=2'
  }

  const [changed, updatedQueryString] = updateQueryParameter(queryParameterName, value, operator, queryString);

  if (changed && useDocumentQueryString) {
    const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + (updatedQueryString === '' ? '' : '?' + updatedQueryString);
    window.history.pushState({path: newUrl}, '', newUrl);
  }
  return updatedQueryString;
};
