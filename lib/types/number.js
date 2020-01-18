exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'number';
        if (content) {
            INPUT.value = content;
        }
        if (options.step) {
            INPUT.step = options.step;
        }
        if (options.min) {
            INPUT.min = options.min;
        }
        if (options.max) {
            INPUT.max = options.max;
        }

        if (onChange) {
            INPUT.oninput = event => {
                onChange(event.target.value)
            };
        }

        // TODO add id from options (for label for)
        //TODO add validation regex

        return INPUT;
    },
    view: function (xyz, uri, status, content, settings, options) {
        const SPAN = document.createElement('SPAN');
        switch (status) {
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
                SPAN.innerText = content;
                break;
        }
        return SPAN;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        if (typeof content !== 'number') {
            return false;
        }
        if (options.max && content > options.max) {
            return false;
        }
        if (options.min && content < options.min) {
            return false;
        }
        if (options.step && content / options.step !== Math.floor(content / options.step)) {
            return false;
        }
        return true;
    }
};