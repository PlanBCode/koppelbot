const setupOnChange = (item, TAGs_row, addRow, deleteRow) => item.onChange(item => {
  const content = item.getContent();
  // TODO use   const status = item.getStatus();
  if (item.getMethod() === 'DELETE') {
    for (const key in TAGs_row) {
      if (!(key in content)) deleteRow(key);
    }
  } else if (item.getMethod() === 'PUT' || item.getMethod() === 'POST' || item.getMethod() === 'PATCH') {
    for (const key in content) {
      if ((TAGs_row instanceof Array && key >= TAGs_row.length) || (!(TAGs_row instanceof Array) && !TAGs_row.hasOwnProperty(key))) {
        const subContent = content[key];
        addRow(key, subContent);
      }
    }
  }
});

exports.setupOnChange = setupOnChange;

exports.actions = {
  edit: function (item) {
    // TODO create ui for adding/removing elements
    // TODO create drop ui to drag elements to
    // TODO check if content is array
    const content = item.getContent();
    const subSettings = item.getSetting('subType');
    const TABLE = document.createElement('TABLE');
    const TR_add = document.createElement('TR');
    const TD_key = document.createElement('TD');
    const TD_value = document.createElement('TD');
    const INPUT_key = document.createElement('INPUT');

    const INPUT_create = document.createElement('INPUT');
    INPUT_create.type = 'submit';
    // TODO add class
    INPUT_create.validUris = {};
    INPUT_create.value = 'Add';
    const data = {};
    const addOptions = {showLabels: false, display: item.getOption('display')};
    const TRs = item.renderCreator(addOptions, item.getUri(), subSettings, ['new'], data, INPUT_create);
    const TABLE_create = document.createElement('TABLE');
    TRs.forEach(TR => TABLE_create.appendChild(TR));
    INPUT_create.onclick = () => {
      const key = INPUT_key.value;
      //            addTR(key, data['new']);
      item.patch(data.new, [key]);
    };

    TD_key.appendChild(INPUT_key);
    TD_value.appendChild(TABLE_create);
    TD_value.appendChild(INPUT_create);

    TR_add.appendChild(TD_key);
    TR_add.appendChild(TD_value);
    TABLE.appendChild(TR_add);

    const rows = {};
    const addTR = (key, subContent) => {
      const TR = document.createElement('TR');
      const TD_key = document.createElement('TD');
      const TD_value = document.createElement('TD');

      const INPUT_remove = document.createElement('INPUT');
      INPUT_remove.type = 'submit';
      // TODO add class
      INPUT_remove.value = 'x';
      INPUT_remove.onclick = () => {
        item.delete([key]);
      };
      TD_key.appendChild(INPUT_remove);
      const TEXT_key = document.createTextNode(key);
      TD_key.appendChild(TEXT_key);
      const subOptions = {
        showLabels: false,
        display: item.getOption('display'),
        onChange: (newContent, additionalSubPropertyPath) => {
          item.patch(newContent, [key].concat(additionalSubPropertyPath));
        }
      };
      const TAG = item.renderSubElement('edit', [key], item.getStatus(), subContent, subSettings, subOptions);
      TD_value.appendChild(TAG);

      TR.appendChild(TD_key);
      TR.appendChild(TD_value);
      rows[key] = TR;
      TABLE.insertBefore(TR, TR_add);
    };
    const deleteRow = key => {
      const TAG_row = rows[key];
      delete rows[key];
      rows.parentNode.removeChild(TAG_row);
    };

    if (typeof content === 'object' && content !== null) {
      for (const key in content) {
        const subContent = content[key];
        addTR(key, subContent);
      }
    }
    setupOnChange(item, rows, addTR, deleteRow);
    return TABLE;
  },
  view: function (item) {
    // TODO check if content is array
    const content = item.getContent();
    const subSettings = item.getSetting('subType');
    const keySubSettings = item.hasSetting('keyType') ? item.getSetting('keyType') : null;
    const subOptions = item.getOptions(); // TODO
    const TABLE = document.createElement('TABLE');
    const rows = {};
    const addTR = (key, subContent) => {
      const TR = document.createElement('TR');
      const TD_key = document.createElement('TD');
      const TD_value = document.createElement('TD');
      if (keySubSettings === null) TD_key.innerHTML = key + '&nbsp;:&nbsp;';
      else {
        const TAG_key = item.renderSubElement('view', ['_key_'], item.getStatus(), key, keySubSettings, subOptions);
        TD_key.appendChild(TAG_key);
        const SPAN_colon = document.createElement('SPAN');
        SPAN_colon.innerHTML = '&nbsp;:&nbsp;';
        TD_key.appendChild(SPAN_colon);
      }
      TR.appendChild(TD_key);
      const TAG = item.renderSubElement('view', [key], item.getStatus(), subContent, subSettings, subOptions);
      TD_value.appendChild(TAG);
      TR.appendChild(TD_value);
      rows[key] = TR;
      TABLE.appendChild(TR);
    };
    for (const key in content) {
      const subContent = content[key];
      addTR(key, subContent);
    }
    setupOnChange(item, rows, addTR);
    return TABLE;
  },
  validateContent: function (item) {
    const content = item.getContent();
    if (content === null || typeof content !== 'object') {
      return false;
    }
    const subSettings = item.getSetting('subType');
    for (const key in content) {
      const subContent = content[key];
      if (!item.validateContent(content, subSettings)) {
        return false;
      }
    }
    return true;
  },
  validateSubPropertyPath: function (subPropertyPath, settings, validateSubPropertyPath) {
    const subType = settings.subType.type || 'string';
    return subPropertyPath instanceof Array &&
            typeof subPropertyPath[0] === 'string' &&
            validateSubPropertyPath(subType, subPropertyPath.slice(1));
  }
};
