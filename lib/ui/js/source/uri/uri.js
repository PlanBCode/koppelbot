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

exports.pathFromUri = pathFromUri;
exports.wrapContent = wrapContent;