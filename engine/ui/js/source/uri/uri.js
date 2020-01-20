const pathFromUri = uri => {
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
        return entityClassNameList.split(','); //TODO check if exist
    }
};

const getBaseUri = uri => {
    const path0 = pathFromUri(uri)[0];
    return '/' + (typeof path0 === 'string' ? path0 : '*');
};

exports.getBaseUri = getBaseUri;
exports.getEntityClassNames = getEntityClassNames;
exports.pathFromUri = pathFromUri;
exports.wrapContent = wrapContent;