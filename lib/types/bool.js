exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        //TODO radio flavor to distinguish two options
        const INPUT = document.createElement('INPUT');
        INPUT.type='checkbox';
        INPUT.checked=!!content;
        INPUT.onchange = () => {
            const content = INPUT.checked;
            onChange(content);
        };
        return INPUT;
    },
    view: function (xyz, uri, status, content, settings, options) {
        const SPAN = document.createElement('SPAN');
        //TODO 404 etc status outputs (refactor from string)
        //TODO use settings to get yes|no label
        SPAN.innerText = content ? 'yes':'no';
        return SPAN;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        return typeof content === 'boolean';
    }
};