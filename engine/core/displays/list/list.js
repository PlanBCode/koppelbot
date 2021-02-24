/*

options
- TODO addDeleteButtons
- TODO addEditButtons
- TODO add multiselect tools
 */

const {getStateMessage} = require('../item/item');

function sortTable (TABLE, columnIndex, ascending, type) {
  let switching = true;
  const THEAD = TABLE.firstChild;
  const TBODY = THEAD.nextElementSibling;

  /* Make a loop that will continue until
  no switching has been done: */
  while (switching) {
    // Start by saying: no switching is done:
    switching = false;

    const rows = TBODY.rows;
    /* Loop through all table rows (except the
    first, which contains table headers): */
    let shouldSwitch, i;
    for (i = 0; i < rows.length - 1; i++) {
      // Start by saying there should be no switching:
      shouldSwitch = false;
      /* Get the two elements you want to compare,
      one from current row and one from the next: */
      let x = rows[i].getElementsByTagName('TD')[columnIndex].innerHTML;
      let y = rows[i + 1].getElementsByTagName('TD')[columnIndex].innerHTML;
      if (type === 'number') {
        x = Number(x);
        y = Number(y);
      } else {
        x = x.toLowerCase();
        y = y.toLowerCase();
      }
      // Check if the two rows should switch place:

      if ((ascending && x > y) ||
      (!ascending && x < y)) {
        // If so, mark as a switch and break the loop:
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      /* If a switch has been marked, make the switch
      and mark that a switch has been done: */
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

function sortTableOnClick (TABLE, TD_header, type) {
  TD_header.style.cursor = 'pointer';
  TD_header.onclick = () => {
    let columnIndex;
    let i = 0;
    let ascending;
    const TR_header = TD_header.parentNode.childNodes;
    for (const TD_other of TR_header) {
      if (TD_other === TD_header) {
        columnIndex = i;
        if (TD_header.classList.contains('xyz-list-sorted-asc')) {
          ascending = false;
          TD_other.classList.remove('xyz-list-sorted-asc');
          TD_header.classList.add('xyz-list-sorted-desc');
        } else {
          ascending = true;
          TD_other.classList.remove('xyz-list-sorted-desc');
          TD_header.classList.add('xyz-list-sorted-asc');
        }
      } else {
        TD_other.classList.remove('xyz-list-sorted-asc');
        TD_other.classList.remove('xyz-list-sorted-desc');
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
    INPUT_search.placeholder = 'search';
    INPUT_search.oninput = INPUT_search.inpaste = () => {
      const search = INPUT_search.value.toUpperCase();
      for (const TR of TBODY.children) {
        if (TR !== TR_search && TR !== TR_header) {
          TR.style.display = search === '' || TR.innerHTML.toUpperCase().includes(search) ? 'table-row' : 'none';
        }
      }
    };
    TR_search.className = 'xyz-list-search';
    TD_search.setAttribute('colspan', TR_header.children.length);
    TD_search.appendChild(INPUT_search);
    TR_search.appendChild(TD_search);
    THEAD.appendChild(TR_search);
  }
}

exports.addSearchBox = addSearchBox;

function fixHeaderOnScroll (WRAPPER, THEAD, TBODY) {
  WRAPPER.onscroll = () => {
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
        TD_header.innerHTML = display.getEntityClassName();
        TR_header.appendChild(TD_header);
        const type = flatNodes.getSetting('type');
        sortTableOnClick(TABLE, TD_header, type);
      } else {
        for (const flatPropertyName in flatNodes) {
          const TD_header = document.createElement('TD');
          TD_header.innerText = display.getDisplayName(flatPropertyName);
          const type = flatNodes[flatPropertyName].getSetting('type');
          sortTableOnClick(TABLE, TD_header, type);
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
