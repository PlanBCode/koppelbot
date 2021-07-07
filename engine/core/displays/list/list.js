/*

options
- TODO addDeleteButtons
- TODO addEditButtons
- TODO add multiselect tools
 */

const {getStateMessage} = require('../item/item');

function sortTable (TABLE, columnIndex, ascending, type) {
  const THEAD = TABLE.firstChild;
  const TBODY = THEAD.nextElementSibling;
  const array = [...TBODY.rows].map(row => ({row, value: row.getElementsByTagName('TD')[columnIndex].innerText}));
  if (type === 'number') {
    if (ascending) array.sort((x, y) => Number(x.value) - Number(y.value));
    else array.sort((x, y) => Number(y.value) - Number(x.value));
  } else if (ascending) array.sort((x, y) => x.value.localeCompare(y.value));
  else array.sort((x, y) => y.value.localeCompare(x.value));
  array.forEach(({row}) => TBODY.appendChild(row));
}

function sortTableOnClick (display, TABLE, TD_header, type, propertyName) {
  TD_header.style.cursor = 'pointer';
  TD_header.classList.add('xyz-list-unsorted');

  TD_header.onclick = () => {
    let columnIndex;
    let i = 0;
    let ascending;
    const TR_header = TD_header.parentNode.childNodes;
    for (const TD_other of TR_header) {
      if (TD_other === TD_header) {
        columnIndex = i;
        TD_header.classList.remove('xyz-list-unsorted');
        if (TD_header.classList.contains('xyz-list-sorted-asc')) {
          ascending = false;
          TD_other.classList.remove('xyz-list-sorted-asc');
          TD_header.classList.add('xyz-list-sorted-desc');
        } else {
          ascending = true;
          TD_other.classList.remove('xyz-list-sorted-desc');
          TD_header.classList.add('xyz-list-sorted-asc');
        }
      }
      ++i;
    }
    sortTable(TABLE, columnIndex, ascending, type);
  };
}
exports.sortTableOnClick = sortTableOnClick;

function addSearchBox (display, TR_header, TABLE) {
  if (display.getOption('showSearchBar')) {
    const THEAD = TABLE.firstChild;
    const TBODY = THEAD.nextElementSibling;
    const TR_search = document.createElement('TR');
    const TD_search = document.createElement('TD');
    const INPUT_search = document.createElement('INPUT');
    INPUT_search.placeholder = display.getOption('searchPlaceholder') || 'Search';
    const search = INPUT_search.oninput = INPUT_search.onpaste = () => {
      const needle = INPUT_search.value.toUpperCase();
      for (const TR of TBODY.children) {
        if (TR !== TR_search && TR !== TR_header) {
          TR.style.display = needle === '' || TR.innerHTML.toUpperCase().includes(needle) ? 'table-row' : 'none';
        }
      }
    };
    TR_search.className = 'xyz-list-search';
    TD_search.setAttribute('colspan', TR_header.children.length);
    TD_search.appendChild(INPUT_search);
    const SPAN_clear = document.createElement('SPAN');
    SPAN_clear.className = 'xyz-list-search-clear';
    SPAN_clear.title = 'Clear search text.';
    SPAN_clear.onclick = () => {
      INPUT_search.value = '';
      search();
    };
    TD_search.appendChild(SPAN_clear);
    TR_search.appendChild(TD_search);
    THEAD.appendChild(TR_search);
  }
}

exports.addSearchBox = addSearchBox;

function fixHeaderOnScroll (WRAPPER, THEAD, TBODY) {
  WRAPPER.onscroll = () => {
    const BUTTONs = WRAPPER.getElementsByClassName('xyz-ui-edit');

    if (BUTTONs.length > 0) {
      for (const BUTTON of BUTTONs) BUTTON.style.bottom = -WRAPPER.scrollTop + 'px';
    }
    if (WRAPPER.scrollTop > 0) {
      if (THEAD.style.position !== 'fixed') {
        const TR_header = THEAD.childNodes[0];
        const TR_first = TBODY.childNodes[0];
        if (TR_first && TR_header) {
          for (let i = 0; i < TR_first.children.length; ++i) {
            const width = TR_first.children[i].getBoundingClientRect().width + 'px';
            TR_header.children[i].style.width = width;
            TR_header.children[i].style.minWidth = width;
            TR_header.children[i].style.maxWidth = width;
            /* TODO does not work :-( for (const TR_entity of TBODY.childNodes) {
              TR_entity.children[i].style.width = width;
              TR_entity.children[i].style.minWidth = width;
              TR_entity.children[i].style.maxWidth = width;
            } */
          }
        }

        THEAD.style.position = 'fixed';
        THEAD.style.zIndex = 10;
      }
    } else {
      const TR_header = THEAD.childNodes[0];
      if (TR_header) {
        for (const TD_head of TR_header.children) {
          TD_head.style.width = null;
          TD_head.style.minWidth = null;
          TD_head.style.maxWidth = null;
        }
        /* TODO does not work :-(  for (const TR_entity of TBODY.childNodes) {
          for (const TD of TR_entity.children) {
            TD.style.width = null;
            TD.style.minWidth = null;
            TD.style.maxWidth = null;
          }
        } */
      }
      THEAD.style.position = 'static';
    }
  };
}

exports.fixHeaderOnScroll = fixHeaderOnScroll;

exports.display = {
  waitingForInput: display => {
    display.getWRAPPER().innerText = getStateMessage(display, 'waitingForInputMessage');
    display.showUiEditButton();
  },
  waitingForData: display => {
    display.getWRAPPER().innerText = getStateMessage(display, 'waitingForDataMessage');
    display.showUiEditButton();
  },
  empty: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = '';
    const TABLE = document.createElement('TABLE');
    TABLE.className = 'xyz-list';
    WRAPPER.appendChild(TABLE);
    display.showCreateButton();
    display.showUiEditButton();
  },
  first: display => {
    if (display.getOption('showHeader') !== false) {
      const WRAPPER = display.getWRAPPER();
      const TABLE = WRAPPER.firstChild;
      const THEAD = document.createElement('THEAD');
      const TBODY = document.createElement('TBODY');
      fixHeaderOnScroll(WRAPPER, THEAD, TBODY);
      TABLE.appendChild(THEAD);
      TABLE.appendChild(TBODY);
      const TR_header = document.createElement('TR');
      TR_header.className = 'xyz-list-header';
      if (display.getOption('multiSelect')) {
        const TD_checkbox = document.createElement('TD');
        TD_checkbox.className = 'xyz-list-icon';
        // TODO select all/none
        const INPUT_checkAll = document.createElement('INPUT');
        INPUT_checkAll.type = 'checkbox';
        INPUT_checkAll.onclick = () => {
          if (INPUT_checkAll.checked) display.multiSelectAll();
          else display.multiSelectNone();
        };
        TD_checkbox.appendChild(INPUT_checkAll);
        TR_header.appendChild(TD_checkbox);

        display.onMultiSelect(selectEntityIds => {
          selectEntityIds = selectEntityIds ? selectEntityIds.split(',') : [];
          let all = true;
          let none = true;
          for (const TR of TBODY.childNodes) {
            const TD_checkbox = TR.firstChild;
            const INPUT_checkbox = TD_checkbox.firstChild;
            if (INPUT_checkbox && INPUT_checkbox.type === 'checkbox' && INPUT_checkbox !== INPUT_checkAll) {
              const checked = selectEntityIds.includes(TR.entityId) || selectEntityIds.includes('*');
              INPUT_checkbox.checked = checked;
              if (checked) none = false;
              else all = false;
            }
          }
          INPUT_checkAll.checked = all;
          INPUT_checkAll.indeterminate = (!none && !all);
        });
      }
      if (display.hasOption('color')) {
        const TD = document.createElement('TD');
        TD.className = 'xyz-list-icon';
        TR_header.appendChild(TD);
      }

      const flatNodes = display.getFlatNodes();
      if (flatNodes.constructor !== Object) {
        const TD_header = document.createElement('TD');
        const title = display.getEntityClassName();
        TD_header.innerHTML = title;
        TD_header.title = (display.getOption('sortByToolTipPrefix') || 'Sort by') + ' ' + title;
        TR_header.appendChild(TD_header);
        const type = flatNodes.getSetting('type');
        sortTableOnClick(display, TABLE, TD_header, type);
      } else {
        const hiddenColumns = display.hasOption('hide') ? display.getOption('hide').split(',') : [];
        for (const flatPropertyName in flatNodes) {
          if (hiddenColumns.includes(flatPropertyName)) continue;
          const TD_header = document.createElement('TD');
          const title = display.getDisplayName(flatPropertyName);
          const toolTip = display.getDisplayName(flatPropertyName, false);
          TD_header.title = (display.getOption('sortByToolTipPrefix') || 'Sort by') + ' ' + toolTip;
          TD_header.innerHTML = title;
          const type = flatNodes[flatPropertyName].getSetting('type');
          sortTableOnClick(display, TABLE, TD_header, type, flatPropertyName);
          TR_header.appendChild(TD_header);
        }
      }

      if (display.hasOption('select')) {
        display.onSelect(selectEntityId => {
          for (const TR_entity of TBODY.childNodes) {
            if (TR_entity.entityId === selectEntityId) {
              TR_entity.classList.add('xyz-list-selected');
              TR_entity.scrollIntoView();
            } else TR_entity.classList.remove('xyz-list-selected');
          }
        });
      }
      THEAD.appendChild(TR_header);
      addSearchBox(display, TR_header, TABLE);
    }
    display.showUiEditButton();
  },

  entity: display => {
    const WRAPPER = display.getWRAPPER();
    const columns = display.getFlatNodes();
    const TR_entity = document.createElement('TR');
    TR_entity.className = 'xyz-list-item';
    TR_entity.entityId = display.getEntityId();
    const entityId = display.getEntityId();

    if (display.getOption('multiSelect')) {
      const TD_checkbox = document.createElement('TD');
      TD_checkbox.className = 'xyz-list-icon';
      const INPUT_checkbox = document.createElement('INPUT');
      INPUT_checkbox.type = 'checkbox';

      if (display.isMultiSelected()) INPUT_checkbox.checked = true;

      INPUT_checkbox.onclick = event => {
        if (INPUT_checkbox.checked) display.multiSelectAdd();
        else display.multiSelectRemove();
        event.stopPropagation();
      };
      TD_checkbox.appendChild(INPUT_checkbox);
      TR_entity.appendChild(TD_checkbox);
    }
    if (display.hasOption('color')) {
      const TD = document.createElement('TD');
      TD.className = 'xyz-list-icon';
      const color = display.getColor();
      TD.onclick = display.manageColor();
      TD.style.cursor = 'pointer';
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
      const hiddenColumns = display.hasOption('hide') ? display.getOption('hide').split(',') : [];
      for (const flatPropertyName in columns) {
        if (hiddenColumns.includes(flatPropertyName)) continue;
        const TD_flatProperty = document.createElement('TD');
        const node = columns[flatPropertyName];
        const TAG = node.render(display.getAction(), display.getSubOptions(flatPropertyName));
        TD_flatProperty.appendChild(TAG);
        TR_entity.appendChild(TD_flatProperty);
      }
    }

    const TABLE = WRAPPER.firstChild;
    if (display.getOption('select')) {
      if (display.isSelected() || display.getOption('default') === entityId) {
        TR_entity.classList.add('xyz-list-selected');
      }
      TR_entity.classList.add('xyz-list-selectable');
      TR_entity.onclick = () => display.select();
    }
    const THEAD = TABLE.firstChild;
    const TBODY = THEAD.nextElementSibling;
    TBODY.appendChild(TR_entity);
  },
  remove: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const TABLE = WRAPPER.firstChild;
    const THEAD = TABLE.firstChild;
    const TBODY = THEAD.nextElementSibling;
    for (const TR_entity of TBODY.childNodes) {
      if (typeof TR_entity.entityId === 'string' && (TR_entity.entityId === entityId || entityId === '*')) {
        TBODY.removeChild(TR_entity);
      }
    }
  }
};
