xyz.types.string = {
    edit: function (uri, content, settings, options, onChange) {
        const INPUT = document.createElement('INPUT');
        if (content) {
            INPUT.value = content;
        }
        if (onChange) {
            INPUT.oninput = event => onChange(event.target.value);
        }

        // TODO add id from options (for label for)
        //TODO add validation regex

        return INPUT;
    },
    view: function (uri, content, settings, options) {
        const TEXT = document.createTextNode(content);
        return TEXT;
    },
    validate: function (uri, content, settings, options) {
        //TODO implement client side validation
        return true;//TODO
    }
};