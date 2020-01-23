exports.actions = {
    edit: function (item) {
        const TAG = item.ui(item.getSetting('uri'), {
            display: 'select',
            select: (entityClass, entityId) =>
            {
                console.log('>>>', entityClass, entityId);
                item.patch('/' + entityClass + '/' + entityId)
            },
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
        // content should be "/$entityClassName/$entityId"
        const referenceUri = item.getContent();
        if (typeof referenceUri !== 'string') return false;
        const uri = item.getSetting('uri');
        const entityClassName = uri.substr(1).split('/')[0];
        const referencePath = referenceUri.substr(1).split('/');
        return referencePath[0] === entityClassName && referencePath.length === 2;
    }
};