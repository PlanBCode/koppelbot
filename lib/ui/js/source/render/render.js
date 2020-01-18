const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');

const DEFAULT_TYPE = 'string';

function renderElement(xyz, action, uri, status, content, settings, options) {
    const type = settings.type || DEFAULT_TYPE;
    if (!types.hasOwnProperty(type)) {
        console.error('problem1');
        return;
    }
    if (types[type].hasOwnProperty(action)) {
        let onChange;
        if (action === 'edit') {
            onChange = content => {
                xyz.patch(uri, uriTools.wrapContent(uri, content));
            }
        }
        const TAG = types[type][action](xyz, uri, status, content, settings, options, onChange);

        // Redraw the type on content change
        const listeners = xyz.on(uri, 'changed', (entityId, node) => {
            listeners.forEach(listener => listener.stop());
            const newContent = node.getContent();
            const newStatus = node.getStatus();
            const TAG_new = types[type][action](xyz, uri, newStatus, newContent, settings, options, onChange);
            const PARENT = TAG.parentNode;
            PARENT.removeChild(TAG);
            PARENT.appendChild(TAG_new);
        });

        TAG.className = `xyz-status-${status}`;
        return TAG;
    } else if (settings.hasOwnProperty('signature')) { // create editor from signature view
        //TODO check if content if object
        //TODO check if settings.signature is object
        const DIV = document.createElement('DIV');
        DIV.className = `xyz-status-${status}`;
        for (let subPropertyName in settings.signature) {
            const subSettings = settings.signature[subPropertyName];
            const subContent = content[subPropertyName];
            const subType = subSettings.type;
            const subUri = uri + '/' + subPropertyName;
            const TAG = renderElement(xyz, subType, action, subUri, status, subContent, subSettings, options);
            TAG.className = `xyz-status-${status}`;
            DIV.appendChild(TAG);
        }
        return DIV;
    } else {
        console.error('problem1');
        //TODO something default and/or error
    }
}

exports.element = renderElement;