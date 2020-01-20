exports.actions = {
    edit: function (item) {
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'number';

        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }

        INPUT.step = item.getSetting('step');
        INPUT.min = item.getSetting('min');
        INPUT.max = item.getSetting('max');

        if (item.patch) {
            INPUT.oninput = () => {
                item.patch(INPUT.value)
            };
        }
        item.onChange(node => {
            //TODO use status
            if(INPUT !== document.activeElement) { // we don't want to interupt typing
                INPUT.value = node.getContent();
            }
        });
        // TODO add id from options (for label for)

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
            SPAN.innerText= node.getContent();
        });
        return SPAN;
    },
    validateContent: function (item) {
        const content = item.getContent();
        if (typeof content !== 'number') {
            return false;
        }
        if (item.getSetting('max') && content > item.getSetting('max')) {
            return false;
        }
        if (item.getSetting('min') && content < item.getSetting('min')) {
            return false;
        }
        if (item.getSetting('step') && content / item.getSetting('step') !== Math.floor(content / item.getSetting('step'))) {
            return false;
        }
        return true;
    }
};