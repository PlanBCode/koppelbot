const {pathFromUri} = require('../../../../factory/js/source/uri/uri.js'); // TODO better solution

// check if uri is '/$class/$id' or '/$class/$id/*/.../*' but not '/$class/$id/$property'
function isFullEntity (uri) {
  const path = pathFromUri(uri);
  for (let i = 2; i < path.length; ++i) {
    if (path[i] !== '*' && !path[i].startsWith('?')) return false;
  }
  return true;
}
const messageTypes = {
  waitingForInputMessage: 'Waiting for input...',
  waitingForDataMessage: 'Waiting for data...',
  emptyMessage: 'No items to display.'
};

function getStateMessage (displayItem, messageType) {
  if (displayItem.getOption(messageType)) return displayItem.getOption(messageType);
  else if (displayItem.getOption('hideMessages')) return '';
  else return messageTypes[messageType];
}

exports.getStateMessage = getStateMessage;

exports.display = {
  /**
   * [waitingForInput description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  waitingForInput: displayItem => {
    displayItem.getWRAPPER().innerText = getStateMessage(displayItem, 'waitingForInputMessage');
    displayItem.showUiEditButton();
  },
  /**
   * [waitingForInput description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  waitingForData: displayItem => {
    displayItem.getWRAPPER().innerText = getStateMessage(displayItem, 'waitingForDataMessage');
    displayItem.showUiEditButton();
  },
  /**
   * [waitingForInput description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  empty: displayItem => {
    displayItem.getWRAPPER().innerText = getStateMessage(displayItem, 'emptyMessage');
    displayItem.showUiEditButton();
  },
  /**
   * [waitingForInput description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  first: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    WRAPPER.innerHTML = '';
    if (displayItem.getOption('showCreateButton') === true) displayItem.showCreateButton();

    if (displayItem.hasOption('select')) {
      const selectionVariableName = displayItem.getOption('select');
      const uri = displayItem.getOption('uri');
      const entityIdList = uri.substr(1).split('/')[1] || '';
      if (entityIdList === '$' + selectionVariableName || entityIdList === '${' + selectionVariableName + '}') {
        // todo $locatiemetnogmeer matched ook
      } else {
        displayItem.onSelect(selectedEntityId => {
          for (const TABLE_entity of WRAPPER.children) {
            const TR_header = TABLE_entity.firstChild;
            const entityId = TABLE_entity.entityId;
            if (selectedEntityId === entityId) TR_header.classList.add('xyz-item-selected');
            else TR_header.classList.remove('xyz-item-selected');
          }
        });
      }
    }

    if (displayItem.hasOption('multiSelect')) {
      const selectionVariableName = displayItem.getOption('multiSelect');
      const uri = displayItem.getOption('uri');
      const entityIdList = uri.substr(1).split('/')[1] || '';
      // todo $locatiemetnogmeer matched ook
      if (entityIdList === '$' + selectionVariableName || entityIdList === '${' + selectionVariableName + '}') {
        //
      } else {
        displayItem.onMultiSelect(selectedEntityIdList => {
          for (const TABLE_entity of WRAPPER.children) {
            const TR_header = TABLE_entity.firstChild;
            const INPUT_select = TR_header.firstChild.firstChild;
            const entityId = TABLE_entity.entityId;
            if (typeof selectedEntityIdList === 'string' && selectedEntityIdList.split(',').includes(entityId)) INPUT_select.checked = true;
            else INPUT_select.checked = false;
          }
        });
      }
    }
    displayItem.showUiEditButton();
  },
  /**
   * [entity description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  entity: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const entityId = displayItem.getEntityId();
    const entityClassName = displayItem.getEntityClassName();

    const columns = displayItem.getFlatNodes();

    const TABLE_entity = document.createElement('TABLE');
    TABLE_entity.className = 'xyz-item';
    TABLE_entity.entityId = entityId;
    const uri = '/' + entityClassName + '/' + entityId;
    const showTitle = displayItem.getOption('showTitle') !== false;
    const showEditButton = displayItem.getOption('showEditButton') === true && displayItem.getAction() !== 'edit';

    const showDeleteButton = displayItem.getOption('showDeleteButton') === true && displayItem.getAction() !== 'delete' && isFullEntity(displayItem.getRequestUri());
    const showDoneButton = displayItem.getOption('onDone') && displayItem.getAction() === 'edit';

    let TD_header;
    if (showTitle || showEditButton || showDeleteButton || showDoneButton) {
      const TR_header = document.createElement('TR');
      TR_header.className = 'xyz-item-header';
      TD_header = document.createElement('TD');
      TD_header.setAttribute('colspan', displayItem.getOption('showLabels') !== false ? '2' : '1');
      if (displayItem.hasOption('color')) {
        const SPAN_color = document.createElement('SPAN');
        SPAN_color.style.verticalAlign = 'middle';
        const color = displayItem.getColor();
        SPAN_color.innerHTML = `<svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="${color}"/></svg>&nbsp;`;
        TD_header.appendChild(SPAN_color);
      }

      if (displayItem.hasOption('select')) {
        const selectionVariableName = displayItem.getOption('select');
        const uri = displayItem.getOption('uri');
        const entityIdList = uri.substr(1).split('/')[1] || '';
        if (entityIdList === '$' + selectionVariableName || entityIdList === '${' + selectionVariableName + '}') {
          const SPAN_unselect = document.createElement('SPAN');
          SPAN_unselect.className = 'xyz-item-deselect';
          SPAN_unselect.onclick = () => displayItem.selectNone(undefined, undefined);
          TD_header.appendChild(SPAN_unselect);
        } else {
          TR_header.onclick = event => {
            if (!event.target || event.target.tagName !== 'INPUT') { // prevent multi select click collision
              displayItem.select();
            }
          };
          TR_header.style.cursor = 'pointer';
          if (displayItem.isSelected()) TR_header.classList.add('xyz-item-selected');
        }
      }

      if (displayItem.hasOption('multiSelect')) {
        const selectionVariableName = displayItem.getOption('multiSelect');
        const uri = displayItem.getOption('uri');
        const entityIdList = uri.substr(1).split('/')[1] || '';
        // toto $locatiemetnogmeer matched ook
        if (entityIdList === '$' + selectionVariableName || entityIdList === '${' + selectionVariableName + '}') {
          const SPAN_unselect = document.createElement('SPAN');
          SPAN_unselect.className = 'xyz-item-deselect';
          SPAN_unselect.onclick = () => displayItem.multieSelectRemove();
          TD_header.appendChild(SPAN_unselect);
        } else {
          const INPUT_select = document.createElement('INPUT');
          INPUT_select.onchange = event => {
            displayItem.multiSelectToggle();
            event.stopPropagation();
            return false;
          };
          INPUT_select.type = 'checkbox';
          TD_header.appendChild(INPUT_select);
          if (displayItem.isMultiSelected()) INPUT_select.checked = true;
        }
      }

      TR_header.appendChild(TD_header);

      TABLE_entity.appendChild(TR_header);
    }

    if (showTitle) {
      const SPAN_title = document.createElement('SPAN');
      SPAN_title.innerText = displayItem.getTitle();
      TD_header.appendChild(SPAN_title);
    }
    if (showDeleteButton) {
      const INPUT_deleteButton = document.createElement('INPUT');
      INPUT_deleteButton.classList.add('xyz-delete');
      INPUT_deleteButton.type = 'submit';
      INPUT_deleteButton.style.float = 'right';
      INPUT_deleteButton.value = 'Delete';
      INPUT_deleteButton.onclick = () => {
        displayItem.xyz.delete(uri); // TODO encapsulate xyz
      };
      displayItem.xyz.on(uri, 'access:delete', access => { // TODO encapsulate xyz   // detect access changes
        INPUT_deleteButton.disabled = !access;
      });

      TD_header.appendChild(INPUT_deleteButton);
    }
    if (showDoneButton) {
      const INPUT_doneButton = document.createElement('INPUT');
      INPUT_doneButton.classList.add('xyz-edit');
      INPUT_doneButton.type = 'submit';
      INPUT_doneButton.value = 'Done';
      INPUT_doneButton.style.float = 'right';
      const onDone = displayItem.getOption('onDone');
      if (typeof onDone === 'function') INPUT_doneButton.onclick = onDone;
      TD_header.appendChild(INPUT_doneButton);
    }

    if (showEditButton) {
      const DIV_edit = document.createElement('DIV');
      DIV_edit.style.display = 'none';
      WRAPPER.appendChild(DIV_edit);

      displayItem.xyz.ui({
        display: 'item',
        action: 'edit',
        uri: displayItem.getRequestUri(),
        showLabels: true,
        showDeleteButton,
        onDone: () => {
          DIV_edit.style.display = 'none';
          TABLE_entity.style.display = 'block';
        }
      }, DIV_edit);

      const INPUT_editButton = document.createElement('INPUT');
      INPUT_editButton.classList.add('xyz-edit');
      INPUT_editButton.type = 'submit';
      INPUT_editButton.value = 'Edit';
      INPUT_editButton.style.float = 'right';
      INPUT_editButton.onclick = () => {
        DIV_edit.style.display = 'block';
        TABLE_entity.style.display = 'none';
      };
      displayItem.xyz.on(uri, 'access:patch', access => { // TODO encapsulate xyz   // detect access changes
        INPUT_editButton.disabled = !access;
      });
      TD_header.appendChild(INPUT_editButton);
    }

    if (columns.constructor !== Object) {
      const node = columns;
      const TR_entity = document.createElement('TR');
      // todo name
      const TD_entityContent = document.createElement('TD');
      const TAG = node.render(displayItem.getAction(), displayItem.getOptions());
      TD_entityContent.appendChild(TAG);
      TR_entity.appendChild(TD_entityContent);
      TABLE_entity.appendChild(TR_entity);
    } else {
      for (const flatPropertyName in columns) {
        const TR_flatProperty = document.createElement('TR');
        if (displayItem.getOption('showLabels') !== false) {
          const TD_flatPropertyName = document.createElement('TD');
          TD_flatPropertyName.classList.add('xyz-item-key');
          TD_flatPropertyName.innerHTML = displayItem.getDisplayName(flatPropertyName.split('.'));
          TR_flatProperty.appendChild(TD_flatPropertyName);
        }
        const TD_flatPropertyContent = document.createElement('TD');
        const node = columns[flatPropertyName];
        const TAG = node.render(displayItem.getAction(), displayItem.getSubOptions(flatPropertyName));
        TD_flatPropertyContent.appendChild(TAG);
        TR_flatProperty.appendChild(TD_flatPropertyContent);
        TABLE_entity.appendChild(TR_flatProperty);
      }
    }
    WRAPPER.appendChild(TABLE_entity);
  },
  /**
   * [waitingForInput description]
   * @param  {DisplayItem} displayItem TODO
   * @returns {void}         TODO
   */
  remove: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const entityId = displayItem.getEntityId();
    for (const TABLE_entity of WRAPPER.childNodes) {
      if (typeof TABLE_entity.entityId === 'string' && (TABLE_entity.entityId === entityId || entityId === '*')) {
        WRAPPER.removeChild(TABLE_entity);
      }
    }
  }
};
