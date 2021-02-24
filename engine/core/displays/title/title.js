
exports.display = {

  waitingForInput: displayItem => {
    displayItem.getWRAPPER().innerHTML = '...';
  },

  waitingForData: displayItem => {
    displayItem.getWRAPPER().innerHTML = '...';
  },

  empty: displayItem => {
    displayItem.getWRAPPER().innerHTML = '[Empty]';
  },

  first: displayItem => {
    displayItem.getWRAPPER().innerHTML = '';
  },

  entity: displayItem => {
    const SPAN_entity = document.createElement('SPAN');
    const entityId = displayItem.getEntityId();
    SPAN_entity.entityId = entityId;
    SPAN_entity.classList.add('xyz-title');
    SPAN_entity.innerText = displayItem.getTitle();

    if (displayItem.hasOption('select')) SPAN_entity.onclick = () => displayItem.select();
    else {
      const entityClassName = displayItem.getEntityClassName();
      if (displayItem.getVariable(entityClassName) === entityId) SPAN_entity.classList.add('xyz-selected');
      displayItem.onVariable(displayItem.getEntityClassName(), selectedEntityId => {
        if (selectedEntityId === entityId) SPAN_entity.classList.add('xyz-selected');
        else SPAN_entity.classList.remove('xyz-selected');
      });

      SPAN_entity.onclick = () => {
        displayItem.setVariable(entityClassName, entityId);
      };
    }
    // TODO highlight selection
    // TODO multiselect
    displayItem.getWRAPPER().appendChild(SPAN_entity);
    if (displayItem.hasOption('onReady')) {
      const onReady = displayItem.getOption('onReady');
      if (typeof onReady === 'function') onReady(SPAN_entity.innerText);
    }
  },

  remove: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const entityId = displayItem.getEntityId();
    for (const SPAN_entity of WRAPPER.childNodes) {
      if (typeof SPAN_entity.entityId === 'string' && (SPAN_entity.entityId === entityId || entityId === '*')) {
        WRAPPER.removeChild(SPAN_entity);
      }
    }
  }
};
