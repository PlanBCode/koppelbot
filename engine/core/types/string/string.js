const encodings = ['utf8', 'base64'];  //TODO single source of truth (php+js)

function edit(item) {
    const INPUT = document.createElement('INPUT');
    INPUT.value = item.getContent();
    if (item.getSetting('password') === true) {
        INPUT.type = 'password';
    }
    if (item.patch) {
        INPUT.oninput = () => {
            item.patch(INPUT.value)
        };
    }
    const onChangeHandler = node => {
        //TODO use status
        const content = node.getContent();
        if (INPUT !== document.activeElement) { // we don't want to interrupt typing
            INPUT.value = content;
        }
    };
    item.onChange(onChangeHandler);
    onChangeHandler(item);
    return INPUT;
}

function view(item) {
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
}

function validateContent(item) {
    const content = item.getContent();
    if (typeof content === 'string') {
        if (item.hasSetting('maxLength') && content.length > item.getSetting('maxLength')) return false;
        if (item.hasSetting('minLength') && content.length < item.getSetting('minLength')) return false;
        //TODO  regex, allowed chars
        return true;
    } else if (item.getSetting('binary') && typeof content === 'object') {
        if (!content.hasOwnProperty('encoding')) return false;
        if (!content.hasOwnProperty('content')) return false;
        if (typeof content.content !== 'string') return false;
        if (encodings.indexOf(content.encoding) === -1) return false;
        //TODO validate encoding
        return true;
    }
    return false;
}

exports.actions = {
    edit,
    view,
    validateContent
};