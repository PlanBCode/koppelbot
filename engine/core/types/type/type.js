exports.actions = {
  /**
   * TODO
   * @param {Item} item TODO
   * @abstract
   * @returns {Element} [description]
   */
  edit: function (item) {
    const originalItem = item;
    const TABLE = document.createElement('TABLE');

    const changeHandler = types => item => {
      TABLE.innerHTML = '';
      const TR_type = document.createElement('TR');
      const TD_typeLabel = document.createElement('TD');
      TD_typeLabel.innerText = 'Type';
      const TD_typeSelect = document.createElement('TD');
      const SELECT = document.createElement('SELECT');
      for (const type in types.type) {
        const OPTION = document.createElement('OPTION');
        OPTION.innerText = type;
        SELECT.appendChild(OPTION);
      }
      TD_typeSelect.appendChild(SELECT);
      TR_type.appendChild(TD_typeLabel);
      TR_type.appendChild(TD_typeSelect);
      TABLE.appendChild(TR_type);

      const content = item.getContent() || {};
      const type = content.type || 'string';
      const settings = types.type[type].parameters.getContent();
      for (const key in settings) {
        const TR = document.createElement('TR');
        const TD_label = document.createElement('TD');
        const TD_value = document.createElement('TD');
        TD_label.innerText = key;
        const subSettings = settings[key];
        const subContent = content[key];

        const subOnChange = (newContent, subUri2) => {
          originalItem.patch(newContent, [key]);
        };
        const TAG = originalItem.renderSubElement('edit', [key], item.getStatus(), subContent, subSettings, {onChange: subOnChange});
        TD_value.appendChild(TAG);
        TR.appendChild(TD_label);
        TR.appendChild(TD_value);
        TABLE.appendChild(TR);
      }
    };
    // TODO fix onchange

    originalItem.get('/type', types => {
      changeHandler(types)(originalItem);
      originalItem.onChange(changeHandler(types));
    });
    return TABLE;
  },
  /**
   * TODO
   * @param {Item} item TODO
   * @abstract
   * @returns {Element} [description]
   */
  view: function (item) {
    const SPAN = document.createElement('SPAN');
    const onChange = item => {
      const settings = item.getContent();
      let text = '<b>';
      let first = true;
      text += (settings.type || 'string') + '</b>(';
      for (const key in settings) {
        if (key !== 'type') {
          if (first) {
            first = false;
          } else {
            text += ',';
          }
          text += key + ':' + JSON.stringify(settings[key]).replace(/"/g, '');
        }
      }
      text += ')';
      SPAN.innerHTML = text;
    };
    onChange(item);
    item.onChange(onChange);
    return SPAN;
  },
  /**
   * TODO
   * @param {Item} item TODO
   * @abstract
   * @returns {bool} [description]
   */
  validateContent: function (item) {
    // TODO should be 0 or null always?
    return true;// TODO
  },
  /**
   * TODO
   * @param {Array} subPropertyPath TODO
   * @param {Object} settings TODO
   * @abstract
   * @returns {bool} [description]
   */
  validateSubPropertyPath: function (subPropertyPath, settings) {
    return subPropertyPath instanceof Array;
  }
};
