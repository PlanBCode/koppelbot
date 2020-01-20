const State = require('./state.js').State;
const eventNames = ['changed', 'created', 'removed']; //TODO , 'error'
const response = require('./response.js');

function Listener(listenerHandler, eventName, entityId, subUri) {
    this.stop = () => {
        listenerHandler.removeListener(this);
    };
    this.getSubUri = () => subUri;
    this.getEntityId = () => entityId;
    this.getEventName = () => eventName;
}

function ListenerHandler() {
    const listenersPerEntityIdPerEventNamePerSubUri = {};

    const callListners = (eventName, entityId, listenerEntityId, node, subUri) => {
        if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(listenerEntityId)) {
            const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[listenerEntityId];
            if (listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
                const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];

                if (typeof subUri === 'undefined') { // if no subUri is specified, call all subUri's
                    for (let subUri in listenersPerSubUri) {

                        const subPath = subUri === '' ? [] : subUri.split('/');
                        console.log('1>>>',subPath)
                        const subNode = response.getSubNode(this, entityId, node, subPath);
                        console.log('2 callListener', this.getUri(entityId) + '/' + subUri + ':' + eventName, subNode);
                        if(subNode) {
                            const listeners = listenersPerSubUri[subUri];
                            //TODO create a node to match the subUri
                            listeners.forEach(callback => callback(entityId, subNode, eventName));
                        }
                    }
                } else if (listenersPerSubUri.hasOwnProperty(subUri)) {
                    const subPath = subUri === '' ? [] : subUri.split('/');
                    const subNode = response.getSubNode(this, entityId, node, subPath);
                    console.log('2>>>',subPath)
                    console.log('1 callListener', this.getUri(entityId) + '/' + subUri + ':' + eventName, subNode);
                    if(subNode) {
                        const listeners = listenersPerSubUri[subUri];
                        listeners.forEach(callback => callback(entityId, subNode, eventName));
                    }
                }
            }
        }
    };

    const callAllListeners = (eventName, entityId, node, subUri) => {
        if (eventNames.indexOf(eventName) === -1) throw new Error('Listener eventName "' + eventName + '"  is not in allowed event names: ' + eventNames.join(', ') + '.');
        callListners(eventName, entityId, '*', node, subUri);
        callListners(eventName, entityId, entityId, node, subUri)
    };

    this.callAtomicListeners = (state, entityId, node, subUri) => {
        if (typeof entityId !== 'string') throw new TypeError("entityId is not a string.");
        if (!state instanceof State) throw new TypeError("state is not a State.");

        if (state.isCreated()) {
            callAllListeners('created', entityId, node, subUri);
        } else if (state.isChanged()) {
            callAllListeners('changed', entityId, node, subUri);
        } else if (state.isRemoved()) {
            callAllListeners('removed', entityId, node, subUri);
            //TODO }else if(state.isError()){
            callAllListeners('error', entityId, node, subUri);
        } else {
            // nothing to do
        }
    };

    this.addAtomicListener = (entityId, eventName, callback, subUri) => {
        if (typeof subUri === 'undefined') subUri = '';
        if (typeof subUri !== 'string') throw new TypeError("Listener subUri is not a string.");
        if (typeof callback !== 'function') throw new TypeError("Listener callback is not a function.");
        if (typeof entityId !== 'string') throw new TypeError("Listener entityId is not a string.");
        if (typeof eventName !== 'string') throw new TypeError("Listener eventName is not a string.");
        if (eventNames.indexOf(eventName) === -1) throw new Error('Listener eventName "' + eventName + '"  is not in allowed event names: ' + eventNames.join(', ') + '.');

        if (!listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
            listenersPerEntityIdPerEventNamePerSubUri[entityId] = {};
        }
        const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];

        if (!listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
            listenersPerEventNamePerSubUri[eventName] = {};
        }
        const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
        if (!listenersPerSubUri.hasOwnProperty(subUri)) {
            listenersPerSubUri[subUri] = new Map();
        }
        const listeners = listenersPerSubUri[subUri];
        const listener = new Listener(this, eventName, entityId, subUri);
        listeners.set(listener, callback);

        // for debug reasons output listener counts:
        let count = 0;
        for (let entityId in listenersPerEntityIdPerEventNamePerSubUri) {
            const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];
            for (let eventName in listenersPerEventNamePerSubUri) {
                const listenersPerSubUri = listenersPerEventNamePerSubUri[eventName];
                for (let subUri in listenersPerSubUri) {
                    const listeners = listenersPerSubUri[subUri];
                    count += listeners.size;
                }
            }
        }
        console.log('addListener', this.getUri(entityId) + '/' + subUri + ':' + eventName, count);
        return listener;
    };

    this.removeListener = listener => {
        if (!listener instanceof Listener) throw new TypeError("listener is not a Listener.");

        const entityId = listener.getEntityId();
        if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
            const listenersPerEventNamePerSubUri = listenersPerEntityIdPerEventNamePerSubUri[entityId];
            const eventName = listener.getEventName();
            if (listenersPerEventNamePerSubUri.hasOwnProperty(eventName)) {
                const listenersPerSubUri = listenersPerEventNamePerSubUri [eventName];
                const subUri = listener.getSubUri();
                if (listenersPerSubUri.hasOwnProperty(subUri)) {
                    const listeners = listenersPerSubUri[subUri];
                    if (listeners.has(listener)) {
                        listeners.delete(listener);
                        return true;
                    }
                }
            }
        }
        return false;
    };

    /*this.hasListeners = (entityId, eventName) => { //TODO upgrade with subUri
        if (typeof entityId === 'undefined') {
            return Object.keys(listenersPerEntityIdPerEventNamePerSubUri).length > 0;
        } else if (entityId === '*') {
            if (typeof eventName === 'undefined') {
                return Object.keys(listenersPerEntityIdPerEventNamePerSubUri).length > 0;
            } else if (typeof eventName === 'string') {
                for (let entityId in listenersPerEntityIdPerEventNamePerSubUri) {
                    if (listenersPerEntityIdPerEventNamePerSubUri[entityId].hasOwnProperty(eventName)) {
                        return true;
                    }
                }
                return false;
            } else {
                throw new TypeError("eventName is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
                if (typeof eventName === 'undefined') {
                    return true;
                } else if (typeof eventName === 'string') {
                    return listenersPerEntityIdPerEventNamePerSubUri[entityId].hasOwnProperty(eventName);
                } else {
                    throw new TypeError("eventName is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    };*/

    /*this.removeListeners = (entityId, eventName) => { //TODO upgrade with subUri
        if (typeof entityId === 'undefined') {
            for (let entityId in listenersPerEntityIdPerEventNamePerSubUri) {
                delete listenersPerEntityIdPerEventNamePerSubUri[entityId];
            }
        } else if (entityId === '*') {
            if (typeof eventName === 'undefined') {
                for (let entityId in listenersPerEntityIdPerEventNamePerSubUri) {
                    delete listenersPerEntityIdPerEventNamePerSubUri[entityId];
                }
            } else if (typeof eventName === 'string') {
                for (let entityId in listenersPerEntityIdPerEventNamePerSubUri) {
                    if (listenersPerEntityIdPerEventNamePerSubUri[entityId].hasOwnProperty(eventName)) {
                        delete listenersPerEntityIdPerEventNamePerSubUri[entityId][eventName];
                    }
                }
                if (Object.keys(listenersPerEntityIdPerEventNamePerSubUri[entityId]).length === 0) {
                    delete listenersPerEntityIdPerEventNamePerSubUri[entityId];
                }
                return false;
            } else {
                throw new TypeError("eventName is not a string.");
            }
        } else if (typeof entityId === 'string') {
            if (listenersPerEntityIdPerEventNamePerSubUri.hasOwnProperty(entityId)) {
                if (typeof eventName === 'undefined') {
                    delete listenersPerEntityIdPerEventNamePerSubUri[entityId];
                } else if (typeof eventName === 'string') {
                    delete listenersPerEntityIdPerEventNamePerSubUri[entityId][eventName];
                    if (Object.keys(listenersPerEntityIdPerEventNamePerSubUri[entityId]).length === 0) {
                        delete listenersPerEntityIdPerEventNamePerSubUri[entityId];
                    }
                } else {
                    throw new TypeError("eventName is not a string.");
                }
            }
        } else {
            throw new TypeError("entityId is not a string.");
        }
    }*/
}

exports.Handler = ListenerHandler;
