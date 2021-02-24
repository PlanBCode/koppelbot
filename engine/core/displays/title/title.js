
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
    SPAN_entity.entityId = displayItem.getEntityId();
    SPAN_entity.innerText = displayItem.getTitle();

    if (displayItem.hasOption('select')) SPAN_entity.onclick = () => displayItem.select();
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
