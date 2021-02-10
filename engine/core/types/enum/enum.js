// parse choices from attribute string if required
function getChoices (item) {
  let choices = item.getSetting('choices');
  if (typeof choices === 'string') {
    if (choices.startsWith('[')) choices = JSON.parse(choices);
    else choices = choices.split(',');
  }
  if (!(choices instanceof Array)) choices = [];
}

exports.actions = {
  edit: function (item) {
    const SELECT = document.createElement('SELECT');

    SELECT.onchange = () => {
      const content = SELECT.options[SELECT.selectedIndex].value;
      item.patch(content);
    };

    const choices = getChoices(item);

    if (!item.getSetting('default') && item.getContent() === null) {
      const OPTION = document.createElement('OPTION');
      OPTION.innerText = 'Select...';
      OPTION.setAttribute('disabled', 'true');
      OPTION.selected = true;
      SELECT.appendChild(OPTION);
    }

    const subSettings = item.getSetting('subType') || {};
    const content = item.getContent();
    for (let choice of choices) {
      const OPTION = document.createElement('OPTION');
      if (choice === content) {
        OPTION.selected = true;
      }
      OPTION.innerText = choice; // TODO render choice content
      // OPTION.value = choice;
      // item.renderSubElement('view', ??, item.getStatus(), choice, subSettings, options);
      SELECT.appendChild(OPTION);
    }
    item.onChange(node => {
      // TODO use status
      const content = node.getContent();
      for (let id in SELECT.options) {
        const OPTION = SELECT.options[id];
        if (OPTION.innerText === content) {
          OPTION.selected = true;
        }
      }
    });
    return SELECT;
  },
  view: function (item) {
    const subSettings = item.getSetting('subType') || {};
    // not item.onChange required this is handled by this:
    const TAG = item.renderSubElement('view', [], item.getStatus(), item.getContent(), subSettings, item.getOptions());
    return TAG;
  },
  validateContent: function (item) {
    const choices = getChoices(item);
    if (!(choices instanceof Array)) {
      return false;
    }
    return choices.indexOf(item.getContent()) !== -1;
  }
};
