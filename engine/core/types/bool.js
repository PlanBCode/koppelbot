exports.actions = {
    edit: function (item) {
        //TODO radio flavor to distinguish two options
        const INPUT = document.createElement('INPUT');
        INPUT.type='checkbox';
        INPUT.checked=!!item.getContent();
        INPUT.onchange = () => {
            item.patch(INPUT.checked);
        };
        return INPUT;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        //TODO 404 etc status outputs (refactor from string)
        //TODO use settings to get yes|no label
        SPAN.innerText = item.getContent() ? 'yes':'no';
        return SPAN;
    },
    validate: function (item) {
        return typeof item.getContent() === 'boolean';
    }
};