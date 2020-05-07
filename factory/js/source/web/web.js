exports.setCookie = function (keyValues, expiresInDays) {
    const date = new Date();
    date.setTime(date.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
    const expires = 'expires=' + date.toUTCString();
    for (let key in keyValues) {
        document.cookie = key + '=' + keyValues[key] + ';' + expires + ';path=/';
    }
};

exports.getCookie = function () {
    if (document.cookie === '') {
        return null;
    }
    const keyValuesPairs = document.cookie.split(';');
    const cookie = {};
    for (let keyValuePair of keyValuesPairs) {
        const [key, value] = keyValuePair.split('=');
        cookie[key.trim()] = value.trim();
    }
    return cookie;
};

function getQueryParameters() {
    const queryParameters = {};
    window.location.search
        .substr(1) // '?a=1&b=2' -> 'a=1&b=2'
        .split('&') // ['a=1','b=2']
        .filter(x => x !== '')
        .forEach(function (item) {
            const [key, value] = item.split('='); // 'a=1' -> ['a','1']
            queryParameters[decodeURIComponent(key)] = decodeURIComponent(value);
        });
    return queryParameters;
}

exports.getQueryParameters = getQueryParameters;

exports.getQueryParameter = function (queryParameterName) {
    return getQueryParameters()[queryParameterName];
};

function updateQueryParameter(queryParameterName, value) {
    // '?a=1&b=2' -> ['a=1','b=2']
    const keyValuePairs = document.location.search.substr(1).split('&').filter(x => x !== '');

    let found = false;
    for (let i = 0; i < keyValuePairs.length; ++i) {
        const keyValuePair = keyValuePairs[i];
        const otherKey = keyValuePair.split('=')[0];  //  'a=1' -> 'a'
        if (otherKey === encodeURIComponent(queryParameterName)) {
            if (typeof value === 'undefined') {
                keyValuePairs.splice(i,1);
            }else {
                keyValuePairs[i] = [encodeURIComponent(queryParameterName), encodeURIComponent(value)].join('='); // 'a=value'
            }
            found = true;
            break;
        }
    }

    if (!found && typeof value !== 'undefined') {
        keyValuePairs[keyValuePairs.length] = [encodeURIComponent(queryParameterName), encodeURIComponent(value)].join('=');
    }
    if (keyValuePairs.length) {
        return window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + keyValuePairs.join('&');
    } else {
        return window.location.protocol + '//' + window.location.host + window.location.pathname;
    }
}

exports.setQueryParameter = function (queryParameterName, value) {
    const newUrl = updateQueryParameter(queryParameterName, value);
    window.history.pushState({path: newUrl}, '', newUrl);
};