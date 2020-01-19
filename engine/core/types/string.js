exports.actions = {
    edit: function (item) {
        const INPUT = document.createElement('INPUT');
        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }
        if (item.patch) {
            INPUT.oninput = () => {
                item.patch(INPUT.value)
            };
        }

        // TODO add id from options (for label for)
        //TODO add validation regex

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
        return SPAN;
    },
    validate: function (item) {
        //TODO implement client side validation
        return typeof item.getContent() === 'string';//TODO min max length, regex
    }
};