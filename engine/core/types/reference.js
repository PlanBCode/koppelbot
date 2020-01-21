exports.actions = {
    edit: function (item) {
        const TAG = item.ui(item.getSetting('uri'), {
            display: 'select',
            select: (entityClass, entityId) => item.patch('/' + entityClass + '/' + entityId),
            initialValue: item.getContent()
        });
        //TODO onchange : how to?
        return TAG;
    },
    view: function (item) {
        const DIV = document.createElement('DIV');
        if (typeof item.getContent() !== 'undefined') {
            item.ui(item.getContent(), {display: 'item'}, DIV);
        }
        //TODO onchange : how to? redo the ui definition
        return DIV;
    },
    validateContent: function (item) {
        //TODO implement client side validation specific for referenced entity type
        return true;//TODO
    }
};