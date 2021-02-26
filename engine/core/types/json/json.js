function renderJSON (data) {
  switch (typeof data) {
    case 'number':
    case 'bigint':
    case 'boolean':
    case 'null':
    case 'undefined':
    case 'string':
      return String(data);
    case 'function':
      return '[Function]'; // TODO ??
    case 'object':
      if (data === null) return 'null';
      else if (data instanceof Array) {
        let html = '<table class="xyz-list">';
        for (const value of data) {
          html += '<tr><td>' + value + '</td></tr>';
        }
        return html + '</table>';
      } else {
        let html = '<table class="xyz-list">';
        for (const key in data) {
          html += '<tr><td class="xyz-item-key">' + key + '</td><td>' + data[key] + '</td></tr>';
        }
        return html + '</table>';
      }
  }
}

exports.actions = {
  edit: function (item) {
    const TEXTAREA = document.createElement('TEXTAREA');
    TEXTAREA.value = JSON.stringify(item.getContent());
    TEXTAREA.oninput = () => {
      let content;
      try {
        content = JSON.parse(TEXTAREA.value);
      } catch (e) {
        // TODO
        return;
      }
      item.patch(content);
    };
    item.onChange(item => {
      if (TEXTAREA !== document.activeElement) {
        TEXTAREA.value = JSON.stringify(item.getContent());
      }
    });
    return TEXTAREA;
  },
  view: function (item) {
    const DIV = document.createElement('DIV');
    DIV.innerText = JSON.stringify(item.getContent());
    const onChangeHandler = item => {
      // TODO check status
      DIV.innerHTML = renderJSON(item.getContent());
    };
    onChangeHandler(item);
    item.onChange(onChangeHandler);

    return DIV;
  },
  validateContent: function (item) {
    return true;
  },
  validateSubPropertyPath: function (subPropertyPath, settings) {
    return subPropertyPath instanceof Array;
  }
};
