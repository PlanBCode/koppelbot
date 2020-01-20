exports.actions = {
    edit: function (item) {
        //TODO make visible with options.something
        const SPAN = document.createElement('SPAN');
        SPAN.innerText = 'auto increment';
        return SPAN;
    },
    view: function (item) {
        //TODO make visible with options.something
        const SPAN = document.createElement('SPAN');
        SPAN.innerText = item.getContent();
        item.onChange(item => {
            SPAN.innerText = item.getContent();
        });
        return SPAN;
    },
    validateContent: function (item) {
        //TODO should be 0 or null always?
        return true;//TODO
    }
};