exports.actions = {
    edit: function (item) {
        const TAG = item.ui('/' + item.getSetting('class') + '/*/id', {
            display: 'select',
            select: item.patch,
            initialValue: item.getContent()
        }); // TODO how to determine id or title?
        return TAG;
    },
    view: function (item) {
        const DIV = document.createElement('DIV');
        item.ui('/' + item.getSetting('class') + '/' + item.getContent(), {display: 'item'}, DIV);
        return DIV;
    },
    validate: function (item) {
        //TODO implement client side validation specific for referenced entity type
        return true;//TODO
    }
};