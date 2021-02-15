exports.setCookie = function (keyValues, expiresInDays) {
  const date = new Date();
  date.setTime(date.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
  const expires = 'expires=' + date.toUTCString();
  for (const key in keyValues) { document.cookie = key + '=' + keyValues[key] + ';' + expires + ';path=/'; }
};

exports.getCookie = function () {
  if (document.cookie === '') return null;
  const keyValuesPairs = document.cookie.split(';');
  const cookie = {};
  for (const keyValuePair of keyValuesPairs) {
    const [key, value] = keyValuePair.split('=');
    cookie[key.trim()] = value.trim();
  }
  return cookie;
};

function getQueryParameters (filter) {
  const queryParameters = {};
  window.location.search
    .substr(1) // '?a=1&b=2' -> 'a=1&b=2'
    .split('&') // ['a=1','b=2']
    .filter(x => x !== '')
    .forEach(keyValuePair => {
      const [key, operator, value] = splitKeyValuePair(keyValuePair); // 'a=1' -> ['a','=','1']
      if (operator === '=' && !filter) queryParameters[decodeURIComponent(key)] = decodeURIComponent(value);
      else if (operator !== '=' && filter) queryParameters[decodeURIComponent(key)] = [operator, decodeURIComponent(value)];
    });
  return queryParameters;
}

exports.getQueryFilters = () => getQueryParameters(true);

exports.getQueryParameters = getQueryParameters;
exports.getQueryParameter = queryParameterName => getQueryParameters()[queryParameterName];

function splitKeyValuePair (keyValueString) { // 'a=1' -> ['a','=','1']
  return /^(?<key>[*,;%\w.-]+)(?<operator>[^*,;%\w.-]+)?(?<value>[*,;%\w.-]*)?$/.exec(keyValueString).slice(1);
}

function updateQueryParameter (queryParameterName, value, operator = '=') {
  const keyValuePairs = document.location.search.substr(1).split('&').filter(x => x !== ''); // '?a=1&b=2' -> ['a=1','b=2']

  let found = false;
  let changed = false;
  for (let i = 0; i < keyValuePairs.length; ++i) {
    const [otherKey, otherOperator, otherValue] = splitKeyValuePair(keyValuePairs[i]); // 'a=1' -> ['a','=']
    if (otherKey === encodeURIComponent(queryParameterName) && otherOperator === operator) {
      if (typeof value === 'undefined') keyValuePairs.splice(i, 1); // remove keyValuePair
      else keyValuePairs[i] = [encodeURIComponent(queryParameterName), encodeURIComponent(value)].join(operator); // 'a=value'
      found = true;
      if (encodeURIComponent(value) !== otherValue) changed = true;
      break;
    }
  }

  if (!found && typeof value !== 'undefined') {
    keyValuePairs.push([encodeURIComponent(queryParameterName), encodeURIComponent(value)].join(operator));
    changed = true;
  }

  return [changed, window.location.protocol + '//' + window.location.host + window.location.pathname + (keyValuePairs.length ? '?' + keyValuePairs.join('&') : '')];
}

exports.setQueryParameter = function (queryParameterName, value, operator = '=') {
  const [changed, newUrl] = updateQueryParameter(queryParameterName, value, operator);
  if (changed) window.history.pushState({path: newUrl}, '', newUrl);
};
