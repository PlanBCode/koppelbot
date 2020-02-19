const renderUiCreate = require('./create').renderUiCreate;
const renderUiLogin = require('./login').renderUiLogin;
const renderUiElement = require('./display').renderUiElement;

const DEFAULT_TAG = 'DIV';

const ui = (xyz, entityClasses, options, WRAPPER) => {
    options = options || {};
    if (options.display === 'edit') {
        options.action = 'edit';
        options.display = 'item';
    }
    if (options.display === 'delete') {
        options.action = 'view';
        options.display = 'item';
        options.showDeleteButton = true;
    }
    let SCRIPT;
    if (typeof WRAPPER === 'undefined') {
        const tag = options.tag || DEFAULT_TAG;
        WRAPPER = document.createElement(tag);
        SCRIPT = document.currentScript;
    }
    if (options.id) WRAPPER.id = options.id;
    if (options.class) WRAPPER.className += ' ' + options.class;
    if (options.style) WRAPPER.style = options.style;

    if (SCRIPT) {
        SCRIPT.parentNode.insertBefore(WRAPPER, SCRIPT);
        SCRIPT.parentNode.removeChild(SCRIPT);
    }
    if (options.display === 'create') {
        renderUiCreate(xyz, entityClasses, options, WRAPPER);
    } else if (options.display === 'login') {
        renderUiLogin(xyz, options, WRAPPER);
    } else {
        renderUiElement(xyz, options, WRAPPER);
    }
    return WRAPPER;
};

exports.ui = ui;