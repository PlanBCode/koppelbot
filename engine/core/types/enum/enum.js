// parse choices from attribute string if required
function getChoices (item) {
  let choices = item.getSetting('choices');
  if (typeof choices === 'string') {
    if (choices.startsWith('[') || choices.startsWith('{')) choices = JSON.parse(choices);
    else choices = choices.split(',');
  }

  if (typeof choices !== 'object' || choices === null) choices = [];
  return choices;
}

exports.actions = {
  edit: function (item) {
    const SELECT = document.createElement('SELECT');

    SELECT.onchange = () => {
      const content = SELECT.options[SELECT.selectedIndex].value;
      item.patch(content);
    };

    const choices = getChoices(item) || [];

    if (!item.getSetting('default') && item.getContent() === null) {
      const OPTION = document.createElement('OPTION');
      OPTION.innerText = 'Select...';
      OPTION.setAttribute('disabled', 'true');
      OPTION.selected = true;
      SELECT.appendChild(OPTION);
    }

    const subSettings = item.getSetting('subType') || {}; // TODO use
    const content = item.getContent();
    for (const key in choices) {
      const value = choices instanceof Array ? choices[key] : key;
      const text = choices[key];
      const OPTION = document.createElement('OPTION');
      if (value === content) OPTION.selected = true;
      OPTION.value = value;
      OPTION.innerText = text; // TODO render choice content
      // item.renderSubElement('view', ??, item.getStatus(), choice, subSettings, options);
      SELECT.appendChild(OPTION);
    }
    item.onChange(node => {
      // TODO use status
      const content = node.getContent();
      for (const id in SELECT.options) {
        const OPTION = SELECT.options[id];
        if (OPTION.innerText === content) OPTION.selected = true;
      }
    });
    return SELECT;
  },
  view: function (item) {
    const subSettings = item.getSetting('subType') || {};
    // TODO MAYBE no item.onChange required this is handled by this:
    const choices = getChoices(item) || [];
    const choice = choices instanceof Array
      ? item.getContent()
      : choices[item.getContent()];
    const TAG = item.renderSubElement('view', [], item.getStatus(), choice, subSettings, item.getOptions());
    return TAG;
  },
  validateContent: function (item) {
    const choices = getChoices(item);
    if (typeof choices !== 'object' || choices === null) return false;
    if (choices instanceof Array) return choices.includes(item.getContent());
    return choices.hasOwnProperty(item.getContent());
  }
};
