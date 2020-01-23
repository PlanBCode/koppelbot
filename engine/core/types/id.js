exports.actions = {
    edit: function (item) {
        //TODO make visible with options.something
        const content = item.getContent();
        if (item.getSetting('autoIncrement') !== true) {
            const INPUT = document.createElement('INPUT');
            if (content) {
                INPUT.value = content;
            }
            if (item.patch) {
                INPUT.oninput = () => {
                    item.patch(INPUT.value)
                };
            }
            item.onChange(node => {
                //TODO use status
                if (INPUT !== document.activeElement) { // we don't want to interupt typing
                    INPUT.value = node.getContent();
                }
            });
            return INPUT;
        }else {
            const SPAN = document.createElement('SPAN');
            SPAN.innerText = content;
            item.onChange(node => {
                SPAN.innerText = node.getContent();
            });
            return SPAN;
        }
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