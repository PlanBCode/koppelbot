exports.actions = {
    edit: function (item) {
        const INPUT = document.createElement('INPUT');
        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }

        //TODO add validation regex

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
        //TODO implement client side validation
        return typeof item.getContent() === 'string';//TODO min max length, regex
    }
};