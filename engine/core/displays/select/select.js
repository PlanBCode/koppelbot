/*
TODO add radio flavor to provide radio box

options
- select
- flavor  dropdown|TODO radio
- showCreateButton
 */

exports.display = {
  waitingForInput: display => {
    display.getWRAPPER().innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    display.getWRAPPER().innerHTML = 'Waiting for data...';
  },
  empty: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = '';
    if (display.getOption('flavor') === 'radio') {
      // nothing to do
    } else {
      const SELECT = document.createElement('SELECT');
      SELECT.className = 'xyz-select';
      SELECT.onchange = () => {
        const entityId = SELECT.options[SELECT.selectedIndex].value;
        const entityClassName = display.getEntityClassName();
        display.select();
      };
      if (!display.getOption('initialValue')) {
        const OPTION = document.createElement('OPTION');
        OPTION.innerText = 'Select...';
        OPTION.setAttribute('disabled', 'true');
        SELECT.appendChild(OPTION);
      }
      WRAPPER.appendChild(SELECT);
      // const entityClassNameList = display.getRequestUri().substr(1).split('/')[0] || '*';
      // const fullUri = '/' + entityClassNameList;
    }

    display.onSelect(entityId => {
      const WRAPPER = display.getWRAPPER();
      const SELECT = WRAPPER.firstChild;
      let found = false;
      for (const OPTION of SELECT.childNodes) {
        if (OPTION.value === entityId) {
          OPTION.selected = true;
          found = true;
        } else OPTION.removeAttribute('selected');
      }
      if (!found) SELECT.firstChild.selected = true;
    });

    display.showCreateButton();
  },
  first: display => {
    // TODO something with wrapper?
  },
  entity: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const entityClassName = display.getEntityClassName();

    const uri = '/' + entityClassName + '/' + entityId;

    let TAG_container;
    if (display.getOption('flavor') === 'radio') {
      const LABEL = document.createElement('LABEL');
      const SPAN = document.createElement('SPAN');
      const INPUT = document.createElement('INPUT');
      INPUT.setAttribute('type', 'radio');
      INPUT.setAttribute('name', 'radio');
      INPUT.setAttribute('value', uri);
      if (display.getOption('initialValue') === uri) {
        display.select();
        INPUT.checked = true;
      }
      LABEL.appendChild(INPUT);
      if (display.hasOption('color')) {
        const color = display.getColor();
        SPAN.innerHTML = `<svg width="20" height="20" style="display:inline-block;"><circle cx="10" cy="10" r="10" fill="${color}"/></svg>`;
      }

      TAG_container = SPAN;
      LABEL.appendChild(SPAN);
      WRAPPER.appendChild(LABEL);
    } else {
      const SELECT = WRAPPER.firstChild;
      if (SELECT.childElementCount === 0 && !display.getOption('initialValue')) { // select the first option as default
        display.select();
      }

      const OPTION = document.createElement('OPTION');
      TAG_container = OPTION;
      OPTION.value = entityId;
      if (display.isSelected()) {
        OPTION.selected = true;
      }
      if (display.getOption('initialValue') === OPTION.value) {
        display.select();
        OPTION.selected = true;
      }
      SELECT.appendChild(OPTION);
    }

    const propertyPath = display.getPropertyPath();
    if (propertyPath.length === 0) TAG_container.innerText = display.getTitle();
    else {
      const TAG = display.renderEntity();
      TAG_container.appendChild(TAG);
    }
  },
  remove: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const SELECT = WRAPPER.firstChild;
    for (const OPTION of SELECT.childNodes) {
      if ((OPTION.value === entityId || entityId === '*')) {
        SELECT.removeChild(OPTION);
      }
    }
  }
};
