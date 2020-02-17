const entity = require('../entity/entity.js');

function request(method, uri, data, callback) {
    //TODO allow for multiple hosts by prepending http(s)://..
    const location = 'http://localhost:8000/'; //TODO determine dynamically
    const xhr = new XMLHttpRequest();
    xhr.open(method, location + 'api' + uri, true);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            const status = xhr.status;
            const content = xhr.responseText;
            callback(status, content);
        }
    };
    xhr.send(data);
}

const retrieveMeta = (xyz, entityClasses, uri, callback) => {
    const path = uri.substr(1).split('/');
    const entityClassNameList = path[0]; // TODO error if no entityClass

    const entityClassNames = entityClassNameList.split(',').filter(entityClass => !entityClasses.hasOwnProperty((entityClass)));
    if (entityClassNames.length === 0) {
        callback();
    } else {
        request('GET', '/' + entityClassNames.join(',') + '?meta', undefined, (status, content) => {//TODO add querystring better
            //TODO check status
            console.log(uri + ' ' + content);
            const data = JSON.parse(content); //TODO check
            // TODO validate data
            for (let entityClassName of entityClassNames) {
                if (!entityClasses.hasOwnProperty(entityClassName)) {
                    entityClasses[entityClassName] = new entity.Class(xyz, entityClassName, data[entityClassName]['*']);
                }
            }
            callback();
        });
    }
};

exports.delete = (entityClasses, uri) => {
    request('DELETE', uri, null, (status, response) => {
        console.log('delete response: ' + uri + ' ' + response);
        const responseContent = JSON.parse(response);
        entity.handleInput('DELETE', uri, status, responseContent, null, entityClasses);
    });
};

exports.head = uri => {
    request('HEAD', uri, null, (status, response) => {
        console.log('head response: ' + uri + ' ' + response);
    });
};

const handleModifyRequest = (entityClasses, method, uri, requestObjectContent) => {
    console.log(method + ' request', uri, requestObjectContent);
    const requestStringContent = JSON.stringify(requestObjectContent);
    request(method, uri, requestStringContent, (status, responseStringContent) => {
        console.log(method + ' response:' + responseStringContent, uri);
        const responseObjectContent = JSON.parse(responseStringContent);
        entity.handleInput(method, uri, status, responseObjectContent, requestObjectContent, entityClasses);
    });
};

exports.post = (entityClasses, uri, content) => handleModifyRequest(entityClasses, 'POST', uri, content);
exports.patch = (entityClasses, uri, content) => handleModifyRequest(entityClasses, 'PATCH', uri, content);
exports.put = (entityClasses, uri, content) => handleModifyRequest(entityClasses, 'PUT', uri, content);

// callback = Response =>{}
// get the requested uri from cache or request it from server
exports.get = (xyz, entityClasses, uri, dataCallback, metaCallBack) => {
    // get the meta data

    retrieveMeta(xyz, entityClasses, uri, () => {
        if (typeof metaCallBack === 'function') {
            metaCallBack();
        }

        //TODO meta should be good or we have a problem
        //TODO get the data from cache if already in cache
        request('GET', uri, undefined, (status, responseStringContent) => {
            let responseObjectContent;
            try {
                responseObjectContent = JSON.parse(responseStringContent);
            } catch (e) {
                console.error(responseStringContent, e);
            }
            //TODO replace null with current content?
            const state = entity.handleInput('GET', uri, status, responseObjectContent, null, entityClasses);
            //TODO  word er nog iets met state gedaan...?
            if (typeof dataCallback === 'function') {
                const node = entity.getResponse(uri, entityClasses, 'GET');
                dataCallback(node);
            }
        });
    });
};

exports.retrieveMeta = retrieveMeta;