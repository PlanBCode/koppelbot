exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        //TODO use dropdown view
        //TODO pass onChange
        const flavor = options.flavor || 'dropdown';
        //TODO set value
        const TAG = xyz.ui('/' + settings.class + '/*/id', {
            display: 'list',
            flavor,
            select: onChange,
            initialValue: content
        }); // TODO how to determine id or title?
        return TAG;
    },
    view: function (xyz, uri, status, content, settings, options) {
        const DIV = document.createElement('DIV');
        xyz.renderUiElement('/' + settings.class + '/' + content, {display: 'view'}, DIV);
        return DIV;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        //TODO implement client side validation
        return true;//TODO
    }
};