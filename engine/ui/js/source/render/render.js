const types = require('../../build/types.js');
const uriTools = require('../uri/uri.js');
const Item = require('./item.js').constructor;

const DEFAULT_TYPE = 'string';

function element(xyz, action, uri, status, content, settings, options) {
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

        const item = new Item(xyz, uri, status, content, settings, options, onChange);
        let TAG = types[type][action](item);

        //TODO remove this in favor of item.onChange YOYO2

        // Redraw the type on content change
        const listeners = xyz.on(uri, 'changed', (entityId, node) => {
            const newContent = node.getContent();
            const newStatus = node.getStatus();
            const PARENT = TAG.parentNode;
            if(PARENT) {
                const item = new Item(xyz, uri, newStatus, newContent, settings, options, onChange);
                const TAG_new = types[type][action](item);
                PARENT.insertBefore(TAG_new, TAG);
                PARENT.removeChild(TAG);
                TAG = TAG_new;
            }else{
                // TODO ERROR?? listeners should have been removed, remove them now?
            }
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
            const TAG = element(xyz, subType, action, subUri, status, subContent, subSettings, options);
            TAG.className = `xyz-status-${status}`;
            DIV.appendChild(TAG);
        }
        return DIV;
    } else {
        console.error('problem2');
        //TODO something default and/or error
    }
}

exports.element = element;