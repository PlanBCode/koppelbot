exports.actions = {
  edit: function (item) {
    const TAG = item.ui({
      uri: item.getSetting('uri'),
      display: 'select',
      select: (entityClass, entityId) => {
        // TODO check if  entityClass matches?
        item.patch(entityId);
      },
      initialValue: item.getContent(),
      showCreateButton: item.getOption('showCreateButton') || false
    });
    // TODO onchange : how to?
    return TAG;
  },
  view: function (item) {
    const SPAN = document.createElement('SPAN');
    SPAN.classList.add('xyz-reference');
    const uri = item.getSetting('uri');
    const entityClassName = uri.substr(1).split('/')[0];
    const changeHandler = node => {
      // TODO check for errors
      const referenceEntityId = node.getContent();
      const referenceUri = '/' + entityClassName + '/' + referenceEntityId;
      // TODO options : display:'flat'
      // TODO get title property and only retrieve that

      item.ui({uri: referenceUri, display: 'title', onReady: item.getOption('onReady')}, SPAN);
    };
    changeHandler(item);
    return SPAN;
  },
  validateContent: function (item) {
    const referenceUri = item.getContent();
    return typeof referenceUri === 'string' && !referenceUri.includes('/'); // TODO more requirements for ids?
  },
  validateSubPropertyPath: function (subPropertyPath, settings, validateSubPropertyPath) {
    return true;
  }
};
