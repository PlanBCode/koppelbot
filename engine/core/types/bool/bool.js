exports.actions = {
  edit: function (item) {
    // TODO radio flavor to distinguish two options
    const INPUT = document.createElement('INPUT');
    INPUT.type = 'checkbox';
    if (item.getContent()) INPUT.setAttribute('checked', true);
    else INPUT.removeAttribute('checked');

    INPUT.onchange = () => {
      item.patch(INPUT.checked);
    };
    item.onChange(node => {
      if (node.getContent()) INPUT.setAttribute('checked', true);
      else INPUT.removeAttribute('checked');
    });
    return INPUT;
  },
  view: function (item) {
    const SPAN = document.createElement('SPAN');
    // TODO 404 etc status outputs (refactor from string)
    // TODO use settings to get yes|no label
    SPAN.innerText = item.getContent() ? 'yes' : 'no';
    item.onChange(node => {
      // TODO use status
      SPAN.innerText = node.getContent() ? 'yes' : 'no';
    });
    return SPAN;
  },
  validateContent: function (item) {
    return typeof item.getContent() === 'boolean';
  }
};
