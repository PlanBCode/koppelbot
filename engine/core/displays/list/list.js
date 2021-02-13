/*

options
- TODO addDeleteButtons
- TODO addEditButtons
- TODO add multiselect tools
 */

exports.display = {
  waitingForInput: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = 'Waiting for data...';
  },
  empty: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = '';
    const TABLE = document.createElement('TABLE');
    TABLE.className = 'xyz-list';
    WRAPPER.appendChild(TABLE);
    display.showCreateButton();
  },
  first: display => {
    if (display.getOption('showHeader') !== false) {
      const WRAPPER = display.getWRAPPER();
      const columns = display.getFlatNodes();
      const TABLE = WRAPPER.firstChild;
      const TR_header = document.createElement('TR');
      TR_header.className = 'xyz-list-header';
      if (display.getOption('multiSelect')) {
        const TD_checkbox = document.createElement('TD');
        // TODO select all/none
        TR_header.appendChild(TD_checkbox);
      }
      if (display.hasOption('color')) {
        const TD = document.createElement('TD');
        TR_header.appendChild(TD);
      }
      if (columns.constructor !== Object) {
        const TD_header = document.createElement('TD');
        TD_header.innerHTML = display.getEntityClassName();
        TR_header.appendChild(TD_header);
      } else {
        for (const flatPropertyName in columns) {
          const TD_header = document.createElement('TD');
          TD_header.innerHTML = flatPropertyName;
          TR_header.appendChild(TD_header);
        }
      }
      TABLE.appendChild(TR_header);
    }
  },

  entity: display => {
    const WRAPPER = display.getWRAPPER();
    const columns = display.getFlatNodes();
    const TR_entity = document.createElement('TR');
    TR_entity.className = 'xyz-list-item';
    TR_entity.entityId = display.getEntityId();
    const entityId = display.getEntityId();
    const entityClassName = display.getEntityClassName();
    const uri = '/' + entityClassName + '/' + entityId;

    if (display.getOption('multiSelect')) {
      const variableName = display.getOption('multiSelect');
      const TD_checkbox = document.createElement('TD');
      const INPUT_checkbox = document.createElement('INPUT');
      INPUT_checkbox.type = 'checkbox';

      if (display.isMultiSelected(entityClassName, entityId)) INPUT_checkbox.checked = true;

      INPUT_checkbox.onclick = event => {
        if (INPUT_checkbox.checked) display.multiSelectAdd(entityClassName, entityId);
        else display.multiSelectRemove(entityClassName, entityId);
        event.stopPropagation();
      };
      TD_checkbox.appendChild(INPUT_checkbox);
      TR_entity.appendChild(TD_checkbox);
    }
    if (display.hasOption('color')) {
      const TD = document.createElement('TD');
      const color = display.getColor();
      TD.innerHTML = `<svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="${color}"/></svg>`;
      TR_entity.appendChild(TD);
    }

    const propertyPath = display.getPropertyPath();
    if (propertyPath.length === 0) {
      const TD_entityContent = document.createElement('TD');
      TD_entityContent.innerText = display.getTitle();
      TR_entity.appendChild(TD_entityContent);
    } else if (columns.constructor !== Object) {
      const node = columns;
      const TD_entityContent = document.createElement('TD');
      const TAG = node.render(display.getAction(), display.getOptions());
      TD_entityContent.appendChild(TAG);
      TR_entity.appendChild(TD_entityContent);
    } else {
      for (const flatPropertyName in columns) {
        const TD_flatProperty = document.createElement('TD');
        const node = columns[flatPropertyName];
        const TAG = node.render(display.getAction(), display.getSubOptions(flatPropertyName));
        TD_flatProperty.appendChild(TAG);
        TR_entity.appendChild(TD_flatProperty);
      }
    }

    const TABLE = WRAPPER.firstChild;
    if (display.getOption('select')) {
      if (display.isSelected(entityClassName, entityId) || display.getOption('default') === entityId) {
        TR_entity.classList.add('xyz-list-selected');
      }
      TR_entity.onclick = () => {
        display.select(entityClassName, entityId);
        for (const row of TABLE.childNodes) {
          if (row === TR_entity) {
            row.classList.add('xyz-list-selected');
          } else {
            row.classList.remove('xyz-list-selected');
          }
        }
      };
    }
    TABLE.appendChild(TR_entity);
  },
  remove: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const TABLE = WRAPPER.firstChild;
    for (const TR_entity of TABLE.childNodes) {
      if (typeof TR_entity.entityId === 'string' && (TR_entity.entityId === entityId || entityId === '*')) {
        TABLE.removeChild(TR_entity);
      }
    }
  }
};
