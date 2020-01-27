exports.actions = {
    edit: function (item) {
        const INPUT = document.createElement('INPUT');
        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }

        //TODO add validation regex
        if (item.getSetting('password') === true) {
            INPUT.type = 'password';
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
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        const onChangeHandler = node => {
            switch (node.getStatus()) {
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
                    if (item.getSetting('password') === true) {
                        SPAN.innerText = '***';
                    } else {
                        SPAN.innerText = node.getContent();
                    }
                    break;
            }
        };
        onChangeHandler(item);
        item.onChange(onChangeHandler);
        return SPAN;
    },
    validateContent: function (item) {
        //TODO implement client side validation
        return typeof item.getContent() === 'string';//TODO min max length, regex
    }
};