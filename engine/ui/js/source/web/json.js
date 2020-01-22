function json_set(object, keyPath, content) {
    {
        const length = keyPath.length;
        if (length === 0) {
            return content;
        }
        if (typeof object !== 'object' || object === null) {
            throw new TypeError('object not an object');
        } else if (object.hasOwnProperty(keyPath[0])) {
            if (length === 1) {
                object[keyPath[0]] = content;
            } else {
                json_set(object[keyPath[0]], keyPath.slice(1), content);
            }
        } else if (length === 1) {
            object[keyPath[0]] = content;
        } else {
            object[keyPath[0]] = {};
            json_set(object[keyPath[0]], keyPath.slice(1), content);
        }
        return object;
    }
}

function json_unset(object, keyPath) {
    {
        const length = keyPath.length;
        if (length === 0) {
            return undefined;
        }
        if (typeof object !== 'object' || object === null) {
            throw new TypeError('object not an object');
        } else if (object.hasOwnProperty(keyPath[0])) {
            if (length === 1) {
                delete object[keyPath[0]];
            } else {
                json_unset(object[keyPath[0]], keyPath.slice(1));
            }
        }
        return object;
    }
}

//TODO json_get

exports.set = json_set;
exports.unset = json_unset;