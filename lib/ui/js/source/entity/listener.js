function Listener(listenerHandler, type, entityId) {
    this.stop = () => {
        listenerHandler.removeListener(this);
    };
    this.getEntityId = () => entityId;
    this.getType = () => type;
}

function ListenerHandler() {
    const listenersPerEntityIdPerType = {};

    this.callListeners = (entityId, type) => {
        if (typeof entityId !== 'string') {
            throw new TypeError("entityId is not a string.");
        }
        if (typeof type !== 'string') {
            throw new TypeError("type is not a string.");
        }
        if (entityId === '*') {
            for (let entityId in listenersPerEntityIdPerType) {
                const listenersPerType = listenersPerEntityIdPerType[entityId];
                if (listenersPerType.hasOwnProperty(type)) {
                    const listeners = listenersPerType[type];
                    listeners.forEach(callback => callback())
                }
            }
        } else if (listenersPerEntityIdPerType.hasOwnProperty(entityId)) {
            const listenersPerType = listenersPerEntityIdPerType[entityId];
            if (listenersPerType.hasOwnProperty(type)) {
                const listeners = listenersPerType[type];
                listeners.forEach(callback => callback())
            }
        }
    };

    this.addListener = (entityId, type, callback) => {
        if (typeof callback !== 'function') {
            throw new TypeError("callback is not a function.");
        }
        if (typeof entityId !== 'string') {
            throw new TypeError("entityId is not a string.");
        }
        if (typeof type !== 'string') {
            throw new TypeError("type is not a string.");
        }

        let listenersPerType;
        if (!listenersPerEntityIdPerType.hasOwnProperty(entityId)) {
            listenersPerEntityIdPerType[entityId] = {};
        }
        listenersPerType = listenersPerEntityIdPerType[entityId];
        let listeners;
        if (!listenersPerType.hasOwnProperty(type)) {
            listenersPerType[type] = new Map();
        }
        const listener = new Listener(this, type, entityId);
        listeners = listenersPerType[type];
        listeners.set(listener, callback);
        return listener;
    };

    this.removeListener = listener => {
        if (!listener instanceof Listener) {
            throw new TypeError("listener is not of Listener class.");
        }
        const entityId = listener.getEntityId();
        if (listenersPerEntityIdPerType.hasOwnProperty(entityId)) {
            const listenersPerType = listenersPerEntityIdPerType[entityId];
            const type = listener.getType();
            if (listenersPerType.hasOwnProperty(type)) {
                const listeners = listenersPerType[type];
                if (listeners.has(listener)) {
                    listeners.delete(listener);
                    return true;
                }
            }
        }
        return false;
    };

    this.hasListeners = (entityId, type) => {
        if (typeof entityId === 'undefined') {
            return Object.keys(listenersPerEntityIdPerType).length > 0;
        } else if (entityId === '*') {
            if (typeof type === 'undefined') {
                return Object.keys(listenersPerEntityIdPerType).length > 0;
            } else if (typeof type === 'string') {
                for (let entityId in listenersPerEntityIdPerType) {
                    if (listenersPerEntityIdPerType[entityId].hasOwnProperty(type)) {
                        return true;
                    }
                }
                return false;
            } else {
                throw new TypeError("type is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerType.hasOwnProperty(entityId)) {
                if (typeof type === 'undefined') {
                    return true;
                } else if (typeof type === 'string') {
                    return listenersPerEntityIdPerType[entityId].hasOwnProperty(type);
                } else {
                    throw new TypeError("type is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    };

    this.removeListeners = (entityId, type) => {
        if (typeof entityId === 'undefined') {
            for (let entityId in listenersPerEntityIdPerType) {
                delete listenersPerEntityIdPerType[entityId];
            }
        } else if (entityId === '*') {
            if (typeof type === 'undefined') {
                for (let entityId in listenersPerEntityIdPerType) {
                    delete listenersPerEntityIdPerType[entityId];
                }
            } else if (typeof type === 'string') {
                for (let entityId in listenersPerEntityIdPerType) {
                    if (listenersPerEntityIdPerType[entityId].hasOwnProperty(type)) {
                        delete listenersPerEntityIdPerType[entityId][type];
                    }
                }
                if(Object.keys(listenersPerEntityIdPerType[entityId]).length===0){
                    delete listenersPerEntityIdPerType[entityId];
                }
                return false;
            } else {
                throw new TypeError("type is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerType.hasOwnProperty(entityId)) {
                if (typeof type === 'undefined') {
                    delete listenersPerEntityIdPerType[entityId];
                } else if (typeof type === 'string') {
                    delete listenersPerEntityIdPerType[entityId][type];
                    if(Object.keys(listenersPerEntityIdPerType[entityId]).length===0){
                        delete listenersPerEntityIdPerType[entityId];
                    }
                } else {
                    throw new TypeError("type is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    }
}

exports.handler = ListenerHandler;