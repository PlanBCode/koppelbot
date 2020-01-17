const State = require('./state.js').State;
const eventNames = ['changed', 'created', 'removed']; //TODO , 'error'

function Listener(listenerHandler, eventName, entityId) {
    this.stop = () => {
        listenerHandler.removeListener(this);
    };
    this.getEntityId = () => entityId;
    this.getEventName = () => eventName;
}

function ListenerHandler() {
    const listenersPerEntityIdPerEventName = {};

    const callListners = (eventName, entityId, listenerEntityId, node) => {
        if (listenersPerEntityIdPerEventName.hasOwnProperty(listenerEntityId)) {
            const listenersPerEventName = listenersPerEntityIdPerEventName[listenerEntityId];
            if (listenersPerEventName.hasOwnProperty(eventName)) {
                const listeners = listenersPerEventName[eventName];
                listeners.forEach(callback => callback(entityId, node, eventName));
            }
        }
    };

    this.callListeners = (state, entityId, node) => {
        if (typeof entityId !== 'string') throw new TypeError("entityId is not a string.");
        if (!state instanceof State) throw new TypeError("state is not a State.");

        let eventName;
        if (state.isCreated()) {
            eventName = 'created';
        } else if (state.isChanged()) {
            eventName = 'changed';
        } else if (state.isRemoved()) {
            eventName = 'removed';
            //TODO }else if(state.isError()){
            //   eventName = 'error';
        } else {
            return;
        }
        console.log('callListener', entityId, eventName);

        callListners(eventName, entityId, '*', node);
        callListners(eventName, entityId, entityId, node)
    };

    this.addEntityIdListener = (entityId, eventName, callback) => {
        if (typeof callback !== 'function') throw new TypeError("Listener callback is not a function.");
        if (typeof entityId !== 'string') throw new TypeError("Listener entityId is not a string.");
        if (typeof eventName !== 'string') throw new TypeError("Listener eventName is not a string.");
        if (eventNames.indexOf(eventName) === -1) throw new Error('Listener eventName "' + eventName + '"  is not in allowed event names: ' + eventNames.join(', ') + '.');

        console.log('addListener', entityId, eventName);

        let listenersPerEventName;
        if (!listenersPerEntityIdPerEventName.hasOwnProperty(entityId)) {
            listenersPerEntityIdPerEventName[entityId] = {};
        }
        listenersPerEventName = listenersPerEntityIdPerEventName[entityId];
        let listeners;
        if (!listenersPerEventName.hasOwnProperty(eventName)) {
            listenersPerEventName[eventName] = new Map();
        }
        const listener = new Listener(this, eventName, entityId);
        listeners = listenersPerEventName[eventName];
        listeners.set(listener, callback);

        return listener;
    };

    this.removeListener = listener => {
        if (!listener instanceof Listener) throw new TypeError("listener is not a Listener.");

        const entityId = listener.getEntityId();
        if (listenersPerEntityIdPerEventName.hasOwnProperty(entityId)) {
            const listenersPerEventName = listenersPerEntityIdPerEventName[entityId];
            const eventName = listener.getEventName();
            if (listenersPerEventName.hasOwnProperty(eventName)) {
                const listeners = listenersPerEventName[eventName];
                if (listeners.has(listener)) {
                    listeners.delete(listener);
                    return true;
                }
            }
        }
        return false;
    };

    this.hasListeners = (entityId, eventName) => {
        if (typeof entityId === 'undefined') {
            return Object.keys(listenersPerEntityIdPerEventName).length > 0;
        } else if (entityId === '*') {
            if (typeof eventName === 'undefined') {
                return Object.keys(listenersPerEntityIdPerEventName).length > 0;
            } else if (typeof eventName === 'string') {
                for (let entityId in listenersPerEntityIdPerEventName) {
                    if (listenersPerEntityIdPerEventName[entityId].hasOwnProperty(eventName)) {
                        return true;
                    }
                }
                return false;
            } else {
                throw new TypeError("eventName is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerEventName.hasOwnProperty(entityId)) {
                if (typeof eventName === 'undefined') {
                    return true;
                } else if (typeof eventName === 'string') {
                    return listenersPerEntityIdPerEventName[entityId].hasOwnProperty(eventName);
                } else {
                    throw new TypeError("eventName is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    };

    this.removeListeners = (entityId, eventName) => {
        if (typeof entityId === 'undefined') {
            for (let entityId in listenersPerEntityIdPerEventName) {
                delete listenersPerEntityIdPerEventName[entityId];
            }
        } else if (entityId === '*') {
            if (typeof eventName === 'undefined') {
                for (let entityId in listenersPerEntityIdPerEventName) {
                    delete listenersPerEntityIdPerEventName[entityId];
                }
            } else if (typeof eventName === 'string') {
                for (let entityId in listenersPerEntityIdPerEventName) {
                    if (listenersPerEntityIdPerEventName[entityId].hasOwnProperty(eventName)) {
                        delete listenersPerEntityIdPerEventName[entityId][eventName];
                    }
                }
                if (Object.keys(listenersPerEntityIdPerEventName[entityId]).length === 0) {
                    delete listenersPerEntityIdPerEventName[entityId];
                }
                return false;
            } else {
                throw new TypeError("eventName is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerEventName.hasOwnProperty(entityId)) {
                if (typeof eventName === 'undefined') {
                    delete listenersPerEntityIdPerEventName[entityId];
                } else if (typeof eventName === 'string') {
                    delete listenersPerEntityIdPerEventName[entityId][eventName];
                    if (Object.keys(listenersPerEntityIdPerEventName[entityId]).length === 0) {
                        delete listenersPerEntityIdPerEventName[entityId];
                    }
                } else {
                    throw new TypeError("eventName is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    }
}

//TODO remove
function combineStatus(currentStatus, additionalStatus) {
    switch (typeof currentStatus) {
        case 'undefined' :
            return additionalStatus;
        case 'number' :
            return currentStatus === additionalStatus ? currentStatus : 207;
    }
    throw new TypeError('currentStatus is not a number.')
}

exports.Handler = ListenerHandler;
exports.combineStatus = combineStatus;