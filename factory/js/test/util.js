function matchArray(a, b) {
    if (a.length !== b.length) return false;
    for(let index=0; index< a.length; ++index){
        if (!match(a[index], b[index])) return false;
    }
    return true;
}

function matchObject(a, b) {
    for (let key in a) {
        if (!b.hasOwnProperty(key)) return false;
        if (!match(a[key], b[key])) return false;
    }
    for (let key in b) {
        if (!a.hasOwnProperty(key)) return false;
    }
    return true;
}

function match(a, b) {
    if (typeof a !== typeof b) return false;
    switch (typeof a) {
        case 'string':
        case 'number':
        case 'boolean':
            return a === b;
        case 'function':
            return false;
        case 'object':
            if (a === null || b === null) return a === b;
            if (a instanceof Array || b instanceof Array) {
                return matchArray(a, b);
            }
            return matchObject(a, b);
    }
}

function TestResult(success, message) {
    this.validate = () => {
        if (!success) {
            throw message;
        }
    }
}

exports.match = match;
exports.TestResult = TestResult;