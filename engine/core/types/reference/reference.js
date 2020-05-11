exports.actions = {
    edit: function (item) {
        const TAG = item.ui({
            uri: item.getSetting('uri'),
            display: 'select',
            select: (entityClass, entityId) => item.patch('/' + entityClass + '/' + entityId),
            initialValue: item.getContent(),
            showCreateButton: item.getOption('showCreateButton') || false
        });
        //TODO onchange : how to?
        return TAG;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        SPAN.classList.add('xyz-reference');

        const changeHandler = node => {
            SPAN.innerHTML = node.getContent();
            SPAN.onclick = () => {
                const [entityClassName, entityId] = node.getContent().substr(1).split('/')
                item.select(entityClassName, entityId);
            }
        }
        changeHandler(item);
        return SPAN;
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