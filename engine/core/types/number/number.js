exports.actions = {
    edit: function (item) {
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'number';
        // TODO add id from options (for label for)
        INPUT.value = item.getContent();
        INPUT.step = item.getSetting('step');
        INPUT.min = item.getSetting('min');
        INPUT.max = item.getSetting('max');

        if (item.patch) {
            INPUT.oninput = () => {
                item.patch(INPUT.value)
            };
        }
        const onChangeHandler = node => {
            const content = node.getContent();
            //TODO use status
            if (INPUT !== document.activeElement) { // we don't want to interupt typing
                INPUT.value = content;
            }
        };
        item.onChange(onChangeHandler);
        onChangeHandler(item);
        return INPUT;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        switch (item.getStatus()) {
            case 500 :
                SPAN.innerText = 'Server error';
                break;
            case 400 :
                SPAN.innerText = 'Bad request';
                break;
            case 403 :
                SPAN.innerText = 'Forbidden';
                break;
            case 404 :
                SPAN.innerText = 'Not found';
                break;
            default:
                SPAN.innerText = item.getContent();
                break;
        }
        item.onChange(node => {
            //TODO use status stuff from above
            SPAN.innerText = node.getContent();
        });
        return SPAN;
    },
    validateContent: function (item) {
        const content = Number(item.getContent());
        if (isNaN(content)) {
            return false;
        }
        if (item.hasSetting('max') && content > item.getSetting('max')) {
            return false;
        }
        if (item.hasSetting('min') && content < item.getSetting('min')) {
            return false;
        }
        if (item.hasSetting('step') && content / item.getSetting('step') !== Math.floor(content / item.getSetting('step'))) {
            return false;
        }
        return true;
    }
};