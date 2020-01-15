exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        //TODO make visible with options.something
        const SPAN = document.createElement('SPAN');
        SPAN.innerText = 'auto increment';
        return SPAN;
    },
    view: function (xyz, uri, status, content, settings, options) {
        //TODO make visible with options.something
        const SPAN = document.createElement('SPAN');
        SPAN.innerText = content;
        return SPAN;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        //TODO should be 0 or null always?
        return true;//TODO
    }
};