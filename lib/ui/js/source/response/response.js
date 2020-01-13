const uriTools = require('../uri/uri.js');

exports.constructor = function Response() {
    let primitive;
    const subResponses = {};
    let status;
    let content;
    this.getStatus = () => status;
    this.getContent = () => {
        //TODO if not primitive => throw
        return content;
    };
    this.setContent = (status_, content_) => {
        primitive = true;
        status = status_;
        content = content_;
    };
    this.set = (key, subResponse) => {
        primitive = false;
        const subStatus = subResponse.getStatus();
        subResponses[key] = subResponse;
        if (Object.keys(subResponses).length === 0) {
            status = subStatus;
        } else if (status !== subStatus) {
            status = 207;
        }
    };
    this.isPrimitive = () => primitive;

    // func = (subResponse, propertyName, response) => {}
    this.forEach = func => {
        if (primitive === true) {
            //TODO throw error
        } else {
            for (let propertyName in subResponses) {
                const subResponse = subResponses[propertyName];
                func(subResponse, propertyName, this);
            }
        }
    };
    this.toObject = () => {
        if (primitive === true) {
            return content;
        } else if (primitive === false) {
            const object = {};
            for (let propertyName in subResponses) {
                object[propertyName] = subResponses[propertyName].toObject();
            }
            return object;
        } else {
            return undefined;
        }

    };
    // transformation = (content,  uri, status, depth) => {...}
    this.transform = (transformation, uri, depth) => {
        uri = typeof uri === 'undefined' ? '' : uri;
        depth = typeof depth === 'undefined' ? 0 : depth;
        const node = new Response();
        if (primitive) {
            const transformedContent = transformation(content, uri, status, depth);
            node.setContent(status, transformedContent);
        } else {
            this.forEach((subResponse, key) => {
                const transformedSubResponse = subResponse.transform(transformation, uri + '/' + key, depth + 1);
                node.set(key, transformedSubResponse);
            })
        }
        return node;
    };
    // reduction = ( accumulator, content, uri, status, depth, primitive) => {...}
    this.reduce = (reduction, base, uri, depth) => {
        uri = typeof uri === 'undefined' ? '' : uri;
        depth = typeof depth === 'undefined' ? 0 : depth;
        let accumulator = base;
        if (primitive) {
            accumulator = reduction(accumulator, content, uri, status, depth, true);
        } else {
            for (let propertyName in subResponses) {
                const subResponse = subResponses[propertyName];
                const subContent = subResponse.reduce(reduction, base, uri + '/' + propertyName, depth + 1);
                accumulator = reduction(accumulator, subContent, uri, status, depth, false);
            }
        }
        return accumulator;
    };

    // mapping = ( accumulator, content, key, uri, status, depth, primitive) => {...}
    this.map = (mapping, parent, key, uri, depth) => {
        uri = typeof uri === 'undefined' ? '' : uri;
        depth = typeof depth === 'undefined' ? 0 : depth;
        key = typeof key === 'undefined' ? '' : key;
        if (primitive) {
            mapping(parent, content, key, uri, status, depth, true);
            return null;
        } else {
            const node = mapping(parent, content, key, uri, status, depth, false);
            for (let propertyName in subResponses) {
                const subResponse = subResponses[propertyName];
                subResponse.map(mapping, node, propertyName, uri + '/' + propertyName, depth + 1);
            }
            return node;
        }
    };
    this.filter_ = path => {
        if (path.length === 0 && primitive) {
            const response = new Response();
            response.setContent(status, this.toObject());
            return response;
        }
        const response = new Response();
        let propertyNames;
        if (path[0] === '*' || path.length === 0) {
            propertyNames = Object.keys(subResponses);
        } else {
            propertyNames = path[0].split(',');
        }
        for (let propertyName of propertyNames) {
            const subResponse = subResponses[propertyName].filter_(path.slice(1));
            response.set(propertyName, subResponse);
        }
        return response;
    };

    this.filter = uri => {
        return this.filter_(uriTools.pathFromUri(uri));
    };
    this.keys = () => Object.keys(subResponses);
    this.has = key => subResponses.hasOwnProperty(key);
    this.get = key => subResponses[key];
};

exports = Response;