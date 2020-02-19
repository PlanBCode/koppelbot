const request = require('./request.js');
const uriTools = require('../uri/uri.js');

const on = (xyz, entityClasses, uri, eventName, callback) => {
    //TODO check type, callback and uri
    const listeners = [];
    const entityClassNames = uriTools.getEntityClassNames(uri, entityClasses);
    request.retrieveMeta(xyz, entityClasses, uri, ()=>{
        const subPath = uriTools.pathFromUri(uri).slice(1);
        for (let entityClassName of entityClassNames) {
            if (entityClasses.hasOwnProperty(entityClassName)) {
                const entityClassListeners = entityClasses[entityClassName].addListener(subPath, eventName, callback);
                listeners.push(...entityClassListeners);
            } else {
                // TODO callback 404 on listener
                // if eventName = 'error' or 404  callback(entityClassName);
            }
        }
    });
    return listeners;
};

exports.on = on;