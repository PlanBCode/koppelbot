exports.actions = {
    edit: function (xyz, uri, content, settings, options, onChange) {
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
    view: function (xyz, uri, content, settings, options) {
        const DIV = document.createElement('DIV');
        xyz.renderUiElement('/' + settings.class + '/' + content, {display: 'view'}, DIV);
        return DIV;
    },
    validate: function (xyz, uri, content, settings, options) {
        //TODO implement client side validation
        return true;//TODO
    }
};